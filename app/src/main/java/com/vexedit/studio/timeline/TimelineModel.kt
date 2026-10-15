
package com.vexedit.studio.timeline

/**
 * Zaman çizelgesi alan modeli. Hiçbir Android bağımlılığı içermez;
 * bu sayede JVM birim testleriyle doğrudan doğrulanabilir.
 * Tüm zaman değerleri milisaniyedir (Long).
 */
enum class AspectRatio(val width: Int, val height: Int) {
    W16_9(1920, 1080),
    W9_16(1080, 1920),
    W1_1(1080, 1080)
}

enum class TrackType { VIDEO, AUDIO, TEXT }

data class Clip(
    val id: String,
    val trackType: TrackType,
    val name: String,
    /** Zaman çizelgesindeki başlangıç (ms) */
    val startMs: Long,
    /** Zaman çizelgesindeki süre (ms) */
    val durationMs: Long,
    /** Kaynak dosyadaki başlangıç (ms) — kırpma noktası */
    val sourceInMs: Long = 0L,
    val volume: Float = 1f,
    val muted: Boolean = false,
    val text: String? = null
) {
    val endMs: Long get() = startMs + durationMs

    fun covers(timeMs: Long): Boolean = timeMs >= startMs && timeMs < endMs

    fun movedTo(newStartMs: Long): Clip =
        copy(startMs = newStartMs.coerceAtLeast(0L))

    /** Kırpma: klip süresi asla 200 ms'nin altına düşmez. */
    fun trimmedStart(newStartMs: Long, minMs: Long = 200L): Clip {
        val delta = (newStartMs - startMs).coerceIn(-(sourceInMs), durationMs - minMs)
        return copy(
            startMs = startMs + delta,
            durationMs = durationMs - delta,
            sourceInMs = sourceInMs + delta
        )
    }

    fun trimmedEnd(newEndMs: Long, minMs: Long = 200L): Clip =
        copy(durationMs = (newEndMs - startMs).coerceAtLeast(minMs))
}

data class Timeline(
    val clips: List<Clip> = emptyList(),
    val aspectRatio: AspectRatio = AspectRatio.W16_9
) {
    val durationMs: Long
        get() = clips.maxOfOrNull { it.endMs } ?: 0L

    fun clip(id: String): Clip? = clips.find { it.id == id }

    fun track(type: TrackType): List<Clip> =
        clips.filter { it.trackType == type }.sortedBy { it.startMs }

    fun add(clip: Clip): Timeline = copy(clips = clips + clip)

    fun remove(id: String): Timeline = copy(clips = clips.filterNot { it.id == id })

    fun update(clip: Clip): Timeline =
        copy(clips = clips.map { if (it.id == clip.id) clip else it })

    /** Taşıma: hedef aralık aynı raydaki başka bir kliple çakışırsa reddedilir. */
    fun canMove(id: String, newStartMs: Long): Boolean {
        val moving = clip(id) ?: return false
        if (newStartMs < 0) return false
        val a = newStartMs
        val b = newStartMs + moving.durationMs
        return track(moving.trackType).none { other ->
            other.id != id && a < other.endMs && b > other.startMs
        }
    }

    fun move(id: String, newStartMs: Long): Timeline {
        val c = clip(id) ?: return this
        val safe = newStartMs.coerceAtLeast(0L)
        return if (canMove(id, safe)) update(c.movedTo(safe)) else this
    }

    /** Oynatma konumunda bölme. İki yeni klip döner, orijinali silinir. */
    fun split(id: String, atMs: Long, leftId: String, rightId: String): Timeline {
        val c = clip(id) ?: return this
        if (!c.covers(atMs)) return this
        val offset = atMs - c.startMs
        if (offset < 200L || c.durationMs - offset < 200L) return this
        val left = c.copy(id = leftId, durationMs = offset)
        val right = c.copy(
            id = rightId,
            startMs = atMs,
            durationMs = c.durationMs - offset,
            sourceInMs = c.sourceInMs + offset
        )
        return copy(clips = clips.filterNot { it.id == id } + left + right)
    }

    /** Sıralama: klip, aynı rayda bir sonraki klibin sağına taşınır. */
    fun reorderAfter(id: String, afterId: String): Timeline {
        val c = clip(id) ?: return this
        val after = clip(afterId) ?: return this
        return move(id, after.endMs)
    }

    fun setVolume(id: String, volume: Float): Timeline =
        update(clip(id)!!.copy(volume = volume.coerceIn(0f, 1f)))

    fun setMuted(id: String, muted: Boolean): Timeline =
        update(clip(id)!!.copy(muted = muted))

    /** Efektif ses: sessiz ise 0. */
    fun effectiveVolume(id: String): Float {
        val c = clip(id) ?: return 0f
        return if (c.muted) 0f else c.volume
    }

    fun withAspect(ratio: AspectRatio): Timeline = copy(aspectRatio = ratio)

    fun clipAt(trackType: TrackType, timeMs: Long): Clip? =
        track(trackType).find { it.covers(timeMs) }
}

/** Projelerin diske yazılan hâli — JSON yerine deterministik, test edilebilir biçim. */
data class ProjectDocument(
    val id: String,
    val name: String,
    val savedAtMs: Long,
    val timeline: Timeline
) {
    fun isValid(): Boolean = name.isNotBlank() && timeline.clips.all { it.durationMs > 0 }
}
