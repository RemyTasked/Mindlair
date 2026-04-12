package app.mindlair.services

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import app.mindlair.MindlairApplication
import app.mindlair.models.CapturedContent
import app.mindlair.models.ContentType
import app.mindlair.models.Surface
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class AccessibilityCapture : AccessibilityService() {
    
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val database by lazy { MindlairApplication.instance.database }
    
    private var lastCapturedUrl: String? = null
    private var lastCaptureTime: Long = 0
    private val captureDebounceMs = 5000L
    
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return
        
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                handleWindowChange(event)
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                handleContentChange(event)
            }
        }
    }
    
    override fun onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted")
    }
    
    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
    
    private fun handleWindowChange(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: return
        
        when {
            isYouTube(packageName) -> captureYouTube()
            isSpotify(packageName) -> captureSpotify()
            isBrowser(packageName) -> captureBrowser(packageName)
            isPodcastApp(packageName) -> capturePodcast(packageName)
        }
    }
    
    private fun handleContentChange(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: return
        
        if (isYouTube(packageName) || isSpotify(packageName)) {
            handleWindowChange(event)
        }
    }
    
    private fun captureYouTube() {
        val rootNode = rootInActiveWindow ?: return
        
        try {
            val titleNode = findNodeByViewId(rootNode, "com.google.android.youtube:id/title")
                ?: findNodeByViewId(rootNode, "com.google.android.youtube:id/video_title")
            val channelNode = findNodeByViewId(rootNode, "com.google.android.youtube:id/channel_name")
                ?: findNodeByViewId(rootNode, "com.google.android.youtube:id/owner_text")
            
            val title = titleNode?.text?.toString()?.trim()
            val channel = channelNode?.text?.toString()?.trim()
            
            if (!title.isNullOrBlank() && title.length > 3) {
                val url = "https://www.youtube.com/watch?v=captured_${title.hashCode()}"
                saveCapturedContent(
                    url = url,
                    title = title,
                    source = "YouTube",
                    author = channel,
                    contentType = ContentType.VIDEO,
                    packageName = "com.google.android.youtube"
                )
            }
        } finally {
            rootNode.recycle()
        }
    }
    
    private fun captureSpotify() {
        val rootNode = rootInActiveWindow ?: return
        
        try {
            val titleNode = findNodeByViewId(rootNode, "com.spotify.music:id/title")
                ?: findNodeByViewId(rootNode, "com.spotify.music:id/track_title")
            val artistNode = findNodeByViewId(rootNode, "com.spotify.music:id/subtitle")
                ?: findNodeByViewId(rootNode, "com.spotify.music:id/track_subtitle")
            
            val title = titleNode?.text?.toString()?.trim()
            val artist = artistNode?.text?.toString()?.trim()
            
            if (!title.isNullOrBlank() && title.length > 3) {
                val isPodcast = artist?.contains("Episode", ignoreCase = true) == true ||
                    rootNode.findAccessibilityNodeInfosByText("Episode").isNotEmpty()
                
                if (isPodcast) {
                    saveCapturedContent(
                        url = null,
                        title = title,
                        source = "Spotify",
                        author = artist,
                        contentType = ContentType.PODCAST,
                        packageName = "com.spotify.music"
                    )
                }
            }
        } finally {
            rootNode.recycle()
        }
    }
    
    private fun captureBrowser(packageName: String) {
        val rootNode = rootInActiveWindow ?: return
        
        try {
            val urlBarNode = findUrlBar(rootNode, packageName)
            val url = urlBarNode?.text?.toString()?.trim()
            
            if (!url.isNullOrBlank() && isArticleUrl(url)) {
                val titleNode = findNodeByClassName(rootNode, "android.widget.TextView")
                val title = titleNode?.text?.toString()?.trim() ?: extractTitleFromUrl(url)
                
                saveCapturedContent(
                    url = normalizeUrl(url),
                    title = title,
                    source = extractDomain(url),
                    author = null,
                    contentType = ContentType.ARTICLE,
                    packageName = packageName
                )
            }
        } finally {
            rootNode.recycle()
        }
    }
    
    private fun capturePodcast(packageName: String) {
        val rootNode = rootInActiveWindow ?: return
        
        try {
            val titleNode = findNodeByClassName(rootNode, "android.widget.TextView")
            val title = titleNode?.text?.toString()?.trim()
            
            if (!title.isNullOrBlank() && title.length > 5) {
                saveCapturedContent(
                    url = null,
                    title = title,
                    source = getAppNameFromPackage(packageName),
                    author = null,
                    contentType = ContentType.PODCAST,
                    packageName = packageName
                )
            }
        } finally {
            rootNode.recycle()
        }
    }
    
    private fun saveCapturedContent(
        url: String?,
        title: String,
        source: String,
        author: String?,
        contentType: ContentType,
        packageName: String
    ) {
        val now = System.currentTimeMillis()
        val identifier = url ?: title
        
        if (identifier == lastCapturedUrl && now - lastCaptureTime < captureDebounceMs) {
            return
        }
        
        lastCapturedUrl = identifier
        lastCaptureTime = now
        
        scope.launch {
            try {
                if (url != null) {
                    val existing = database.capturedContentDao()
                        .findByUrlSince(url, now - 3600000)
                    if (existing != null) {
                        Log.d(TAG, "Content already captured recently: $title")
                        return@launch
                    }
                }
                
                val content = CapturedContent(
                    url = url,
                    title = title,
                    source = source,
                    author = author,
                    contentType = contentType,
                    surface = Surface.ANDROID_ACCESSIBILITY,
                    packageName = packageName,
                    capturedAt = now
                )
                
                val id = database.capturedContentDao().insert(content)
                Log.d(TAG, "Captured content: $title (id=$id)")
                
                FloatingBubbleService.showBubble(this@AccessibilityCapture, content.copy(id = id))
                
            } catch (e: Exception) {
                Log.e(TAG, "Error saving captured content", e)
            }
        }
    }
    
    private fun findNodeByViewId(root: AccessibilityNodeInfo, viewId: String): AccessibilityNodeInfo? {
        val nodes = root.findAccessibilityNodeInfosByViewId(viewId)
        return nodes.firstOrNull()
    }
    
    private fun findNodeByClassName(root: AccessibilityNodeInfo, className: String): AccessibilityNodeInfo? {
        if (root.className?.toString() == className && !root.text.isNullOrBlank()) {
            return root
        }
        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val result = findNodeByClassName(child, className)
            if (result != null) return result
        }
        return null
    }
    
    private fun findUrlBar(root: AccessibilityNodeInfo, packageName: String): AccessibilityNodeInfo? {
        val viewIds = when {
            packageName.contains("chrome") -> listOf(
                "com.android.chrome:id/url_bar",
                "com.android.chrome:id/search_box_text"
            )
            packageName.contains("firefox") -> listOf(
                "org.mozilla.firefox:id/url_bar_title",
                "org.mozilla.firefox:id/mozac_browser_toolbar_url_view"
            )
            packageName.contains("samsung") -> listOf(
                "com.sec.android.app.sbrowser:id/location_bar_edit_text"
            )
            packageName.contains("edge") -> listOf(
                "com.microsoft.emmx:id/url_bar"
            )
            else -> emptyList()
        }
        
        for (viewId in viewIds) {
            val node = findNodeByViewId(root, viewId)
            if (node != null) return node
        }
        return null
    }
    
    private fun isYouTube(pkg: String) = pkg == "com.google.android.youtube"
    private fun isSpotify(pkg: String) = pkg == "com.spotify.music"
    private fun isBrowser(pkg: String) = pkg in listOf(
        "com.android.chrome",
        "com.sec.android.app.sbrowser",
        "org.mozilla.firefox",
        "com.microsoft.emmx"
    )
    private fun isPodcastApp(pkg: String) = pkg in listOf(
        "com.google.android.apps.podcasts",
        "com.bambuna.podcastaddict",
        "au.com.shiftyjelly.pocketcasts",
        "fm.overcast.overcastradio"
    )
    
    private fun isArticleUrl(url: String): Boolean {
        val lowerUrl = url.lowercase()
        return !lowerUrl.contains("google.com/search") &&
            !lowerUrl.contains("accounts.google") &&
            !lowerUrl.contains("mail.google") &&
            !lowerUrl.contains("drive.google") &&
            url.contains("/") && url.length > 20
    }
    
    private fun normalizeUrl(url: String): String {
        return if (url.startsWith("http")) url else "https://$url"
    }
    
    private fun extractDomain(url: String): String {
        return try {
            val cleaned = url.replace("https://", "").replace("http://", "")
            cleaned.substringBefore("/").replace("www.", "")
        } catch (e: Exception) {
            url
        }
    }
    
    private fun extractTitleFromUrl(url: String): String {
        return try {
            val path = url.substringAfterLast("/").substringBefore("?")
            path.replace("-", " ").replace("_", " ").trim().ifBlank { "Untitled" }
        } catch (e: Exception) {
            "Untitled"
        }
    }
    
    private fun getAppNameFromPackage(pkg: String): String {
        return when (pkg) {
            "com.google.android.apps.podcasts" -> "Google Podcasts"
            "com.bambuna.podcastaddict" -> "Podcast Addict"
            "au.com.shiftyjelly.pocketcasts" -> "Pocket Casts"
            "fm.overcast.overcastradio" -> "Overcast"
            else -> pkg.substringAfterLast(".").replaceFirstChar { it.uppercase() }
        }
    }
    
    companion object {
        private const val TAG = "AccessibilityCapture"
    }
}
