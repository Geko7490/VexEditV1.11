package com.vexedit.studio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.vexedit.studio.timeline.AspectRatio
import com.vexedit.studio.timeline.Clip
import com.vexedit.studio.timeline.Timeline
import com.vexedit.studio.timeline.TrackType
import com.vexedit.studio.ui.theme.VexEditTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            VexEditTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    VexEditApp()
                }
            }
        }
    }
}

@Composable
fun VexEditApp() {
    var timeline by remember {
        mutableStateOf(
            Timeline()
                .add(Clip("v1", TrackType.VIDEO, "giris.mp4", 0, 4200))
                .add(Clip("v2", TrackType.VIDEO, "sahne.mp4", 4200, 3600))
                .add(Clip("a1", TrackType.AUDIO, "muzik.mp3", 0, 7800, volume = 0.6f))
        )
    }
    var selectedId by remember { mutableStateOf<String?>(null) }
    var playheadMs by remember { mutableStateOf(0L) }
    var language by remember { mutableStateOf("tr") }

    val strings = if (language == "tr") TrStrings else EnStrings

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        StudioHeader(
            title = strings.title,
            language = language,
            onLanguage = { language = it }
        )
        Spacer(Modifier.height(12.dp))
        PreviewPlayer(
            aspectRatio = timeline.aspectRatio,
            clip = timeline.clipAt(TrackType.VIDEO, playheadMs),
            playheadMs = playheadMs
        )
        Spacer(Modifier.height(12.dp))
        AspectSelector(current = timeline.aspectRatio) {
            timeline = timeline.withAspect(it)
        }
        Spacer(Modifier.height(12.dp))
        TimelineEditor(
            timeline = timeline,
            selectedId = selectedId,
            playheadMs = playheadMs,
            onSelect = { selectedId = it },
            onSeek = { playheadMs = it },
            onChange = { timeline = it }
        )
        Spacer(Modifier.height(12.dp))
        ExportPanel(
            timeline = timeline,
            onStatus = { /* durum çubuğuna yazılır */ }
        )
    }
}

@Composable
private fun StudioHeader(title: String, language: String, onLanguage: (String) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.weight(1f))
        listOf("tr" to "TR", "en" to "EN").forEach { (code, label) ->
            TextButton(onClick = { onLanguage(code) }) {
                Text(if (language == code) "[$label]" else label)
            }
        }
    }
}

object TrStrings {
    const val title = "VexEdit Studio"
}

object EnStrings {
    const val title = "VexEdit Studio"
}
