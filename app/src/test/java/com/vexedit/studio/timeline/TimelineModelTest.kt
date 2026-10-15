
package com.vexedit.studio.timeline

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TimelineModelTest {

    private fun clip(
        id: String,
        start: Long,
        dur: Long,
        type: TrackType = TrackType.VIDEO
    ) = Clip(id, type, "clip-$id", start, dur)

    private val base = Timeline()
        .add(clip("a", 0, 2000))
        .add(clip("b", 2000, 3000))
        .add(clip("c", 5000, 1000))

    @Test
    fun duration_isEndOfLastClip() {
        assertEquals(6000L, base.durationMs)
    }

    @Test
    fun move_ontoOccupiedRange_isRejected() {
        val moved = base.move("c", 1000)
        assertEquals(5000L, moved.clip("c")!!.startMs)
    }

    @Test
    fun move_intoFreeRange_succeeds() {
        val empty = Timeline().add(clip("a", 0, 1000))
        val moved = empty.move("a", 4000)
        assertEquals(4000L, moved.clip("a")!!.startMs)
    }

    @Test
    fun move_neverGoesNegative() {
        val moved = base.move("a", -500)
        assertEquals(0L, moved.clip("a")!!.startMs)
    }

    @Test
    fun trimStart_shiftsSourceIn_andKeepsEnd() {
        val c = Clip("x", TrackType.VIDEO, "x", 1000, 3000, sourceInMs = 500)
        val t = c.trimmedStart(1500)
        assertEquals(1500L, t.startMs)
        assertEquals(2500L, t.durationMs)
        assertEquals(1000L, t.sourceInMs)
        assertEquals(4000L, t.endMs)
    }

    @Test
    fun trimStart_cannotGoBeforeSourceStart() {
        val c = Clip("x", TrackType.VIDEO, "x", 1000, 3000, sourceInMs = 500)
        val t = c.trimmedStart(0)
        assertEquals(500L, t.sourceInMs)
        assertEquals(3500L, t.durationMs)
    }

    @Test
    fun trimEnd_enforcesMinimumDuration() {
        val c = clip("x", 0, 3000)
        val t = c.trimmedEnd(10)
        assertEquals(200L, t.durationMs)
    }

    @Test
    fun split_atPlayhead_createsTwoClipsWithContinuousSource() {
        val split = base.split("b", 3500, "b-l", "b-r")
        assertEquals(4, split.clips.size)
        assertEquals(2000L, split.clip("b-l")!!.durationMs)
        assertEquals(3500L, split.clip("b-r")!!.startMs)
        assertEquals(1500L, split.clip("b-r")!!.durationMs)
        assertEquals(1500L, split.clip("b-r")!!.sourceInMs)
    }

    @Test
    fun split_outsideClip_isNoOp() {
        assertEquals(base.clips.size, base.split("b", 400, "l", "r").clips.size)
    }

    @Test
    fun split_tooCloseToEdge_isRejected() {
        assertEquals(base.clips.size, base.split("b", 2050, "l", "r").clips.size)
    }

    @Test
    fun reorderAfter_movesClipBehindAnother() {
        val t = base.reorderAfter("a", "c")
        assertEquals(6000L, t.clip("a")!!.startMs)
        assertTrue(t.canMove("a", 6000))
    }

    @Test
    fun mute_forcesEffectiveVolumeToZero() {
        val t = Timeline().add(Clip("m", TrackType.AUDIO, "m", 0, 4000, volume = 0.8f))
            .setMuted("m", true)
        assertEquals(0f, t.effectiveVolume("m"), 0.0001f)
    }

    @Test
    fun volume_isClampedToZeroOne() {
        val t = Timeline().add(Clip("m", TrackType.AUDIO, "m", 0, 4000))
            .setVolume("m", 4.2f)
        assertEquals(1f, t.clip("m")!!.volume, 0.0001f)
    }

    @Test
    fun clipAt_returnsCoveringClip() {
        assertEquals("b", base.clipAt(TrackType.VIDEO, 2500)!!.id)
        assertNull(base.clipAt(TrackType.VIDEO, 6500))
    }

    @Test
    fun aspectRatio_changesOutputDimensions() {
        val t = base.withAspect(AspectRatio.W9_16)
        assertEquals(1080, t.aspectRatio.width)
        assertEquals(1920, t.aspectRatio.height)
    }

    @Test
    fun projectDocument_rejectsBlankName() {
        val doc = ProjectDocument("p1", "  ", 0L, base)
        assertFalse(doc.isValid())
    }

    @Test
    fun remove_deletesOnlyTheTargetClip() {
        val t = base.remove("b")
        assertEquals(2, t.clips.size)
        assertEquals(6000L, t.durationMs)
    }
}
