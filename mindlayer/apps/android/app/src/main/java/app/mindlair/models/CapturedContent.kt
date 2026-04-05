package app.mindlair.models

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "captured_content")
data class CapturedContent(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val url: String?,
    val title: String,
    val source: String,
    val author: String?,
    val contentType: ContentType,
    val surface: Surface,
    val packageName: String?,
    val capturedAt: Long = System.currentTimeMillis(),
    val durationMs: Long? = null,
    val synced: Boolean = false,
    val syncedAt: Long? = null,
    val remoteId: String? = null
)

enum class ContentType {
    VIDEO,
    PODCAST,
    ARTICLE,
    THREAD,
    OTHER;
    
    fun toApiString(): String = name.lowercase()
}

enum class Surface {
    ANDROID_ACCESSIBILITY,
    ANDROID_AUDIO,
    ANDROID_SHARE;
    
    fun toApiString(): String = name.lowercase()
}

@Entity(tableName = "reactions")
data class Reaction(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val contentId: Long,
    val stance: Stance,
    val note: String?,
    val createdAt: Long = System.currentTimeMillis(),
    val synced: Boolean = false,
    val syncedAt: Long? = null,
    val remoteId: String? = null
)

enum class Stance {
    AGREE,
    DISAGREE,
    COMPLICATED,
    SKIP;
    
    fun toApiString(): String = name.lowercase()
}
