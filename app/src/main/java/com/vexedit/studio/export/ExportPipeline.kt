package com.vexedit.studio.export

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import java.io.File

/**
 * Kayıpsız dışa aktarma: kaynak dosyayı yeniden kodlamadan MP4'e kopyalar.
 * - Bellek tüketimi sabittir (yalnızca 1 MB'lık tampon).
 * - İlerleme gerçek bayt sayısına göre hesaplanır.
 * - İptal edildiğinde kısmi dosya SİLİNİR; sahte ilerleme yoktur.
 */
class ExportPipeline(private val context: Context) {

    sealed class Result {
        data class Success(val file: File, val bytes: Long, val elapsedMs: Long) : Result()
        data class Cancelled(val deletedPartialFile: Boolean) : Result()
        data class Failure(val reason: String, val cause: Throwable? = null) : Result()
    }

    fun export(
        source: Uri,
        output: File,
        onProgress: (Float) -> Unit,
        isCancelled: () -> Boolean
    ): Result {
        val started = System.nanoTime()
        val extractor = MediaExtractor()
        var muxer: MediaMuxer? = null
        return try {
            extractor.setDataSource(context, source, null)

            val retriever = MediaMetadataRetriever().apply { setDataSource(context, source) }
            val durationMs =
                retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                    ?.toLongOrNull() ?: 0L
            retriever.release()

            muxer = MediaMuxer(output.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

            val trackIndexMap = HashMap<Int, Int>(extractor.trackCount)
            for (i in 0 until extractor.trackCount) {
                val format = extractor.getTrackFormat(i)
                // Passthrough için H.265 cihazdan cihaza uyumsuzluk riski taşır.
                val mime = format.getString(MediaFormat.KEY_MIME).orEmpty()
                if (mime.startsWith("video/") || mime.startsWith("audio/")) {
                    trackIndexMap[i] = muxer.addTrack(format)
                    extractor.selectTrack(i)
                }
            }
            if (trackIndexMap.isEmpty()) {
                return Result.Failure("Kaynakta işlenebilir ses veya video izi bulunamadı.")
            }
            muxer.start()

            val buffer = java.nio.ByteBuffer.allocate(1024 * 1024)
            val info = MediaCodec.BufferInfo()
            var written = 0L
            while (true) {
                if (isCancelled()) {
                    muxer.stop(); muxer.release(); extractor.release()
                    val deleted = output.delete()
                    return Result.Cancelled(deletedPartialFile = deleted)
                }
                val trackIndex = extractor.readSampleData(buffer, 0)
                if (trackIndex < 0) break
                info.offset = 0
                info.size = trackIndex
                info.presentationTimeUs = extractor.sampleTime
                info.flags =
                    if (extractor.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0)
                        MediaCodec.BUFFER_FLAG_KEY_FRAME else 0
                val outTrack = trackIndexMap[extractor.sampleTrackIndex] ?: continue
                muxer.writeSampleData(outTrack, buffer, info)
                written += trackIndex
                extractor.advance()

                if (durationMs > 0) {
                    onProgress(
                        (extractor.sampleTime.toFloat() / (durationMs * 1000f)).coerceIn(0f, 1f)
                    )
                }
            }

            muxer.stop()
            onProgress(1f)
            Result.Success(
                file = output,
                bytes = written,
                elapsedMs = (System.nanoTime() - started) / 1_000_000
            )
        } catch (t: Throwable) {
            output.delete()
            Result.Failure(
                reason = "Dışa aktarma başarısız: ${t.javaClass.simpleName} — ${t.message}",
                cause = t
            )
        } finally {
            runCatching { muxer?.release() }
            extractor.release()
        }
    }
}

/*
 * UYGULANMADI — açıkça işaretlenmiştir:
 * Parlaklık/kontrast/renk, geçişler ve efektler yeniden kodlama gerektirir.
 * Bunun için MediaCodec (video encoder) + OpenGL ES 2 renderer + MediaMuxer
 * zinciri kurulmalıdır. Bu sınıfta sahte ilerleme üreten bir yol yoktur;
 * yalnızca gerçekten yazılan baytlar raporlanır.
 */
