package app.mindlair.db

import android.content.Context
import androidx.room.*
import app.mindlair.models.CapturedContent
import app.mindlair.models.ContentType
import app.mindlair.models.Reaction
import app.mindlair.models.Stance
import app.mindlair.models.Surface
import kotlinx.coroutines.flow.Flow

@Database(
    entities = [CapturedContent::class, Reaction::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class CaptureDatabase : RoomDatabase() {
    
    abstract fun capturedContentDao(): CapturedContentDao
    abstract fun reactionDao(): ReactionDao
    
    companion object {
        @Volatile
        private var INSTANCE: CaptureDatabase? = null
        
        fun getInstance(context: Context): CaptureDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    CaptureDatabase::class.java,
                    "mindlair_capture.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}

class Converters {
    @TypeConverter
    fun fromContentType(value: ContentType): String = value.name
    
    @TypeConverter
    fun toContentType(value: String): ContentType = ContentType.valueOf(value)
    
    @TypeConverter
    fun fromSurface(value: Surface): String = value.name
    
    @TypeConverter
    fun toSurface(value: String): Surface = Surface.valueOf(value)
    
    @TypeConverter
    fun fromStance(value: Stance): String = value.name
    
    @TypeConverter
    fun toStance(value: String): Stance = Stance.valueOf(value)
}

@Dao
interface CapturedContentDao {
    @Query("SELECT * FROM captured_content ORDER BY capturedAt DESC")
    fun getAllFlow(): Flow<List<CapturedContent>>
    
    @Query("SELECT * FROM captured_content WHERE synced = 0 ORDER BY capturedAt ASC")
    suspend fun getUnsynced(): List<CapturedContent>
    
    @Query("SELECT COUNT(*) FROM captured_content WHERE synced = 0")
    fun getUnsyncedCountFlow(): Flow<Int>
    
    @Query("SELECT * FROM captured_content WHERE id = :id")
    suspend fun getById(id: Long): CapturedContent?
    
    @Query("SELECT * FROM captured_content WHERE url = :url AND capturedAt > :since LIMIT 1")
    suspend fun findByUrlSince(url: String, since: Long): CapturedContent?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(content: CapturedContent): Long
    
    @Update
    suspend fun update(content: CapturedContent)
    
    @Query("UPDATE captured_content SET synced = 1, syncedAt = :syncedAt, remoteId = :remoteId WHERE id = :id")
    suspend fun markSynced(id: Long, syncedAt: Long, remoteId: String)
    
    @Query("DELETE FROM captured_content")
    suspend fun deleteAll()
    
    @Query("DELETE FROM captured_content WHERE synced = 1 AND syncedAt < :olderThan")
    suspend fun deleteSyncedOlderThan(olderThan: Long)
}

@Dao
interface ReactionDao {
    @Query("SELECT * FROM reactions WHERE contentId = :contentId")
    suspend fun getByContentId(contentId: Long): Reaction?
    
    @Query("SELECT * FROM reactions WHERE synced = 0 ORDER BY createdAt ASC")
    suspend fun getUnsynced(): List<Reaction>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(reaction: Reaction): Long
    
    @Update
    suspend fun update(reaction: Reaction)
    
    @Query("UPDATE reactions SET synced = 1, syncedAt = :syncedAt, remoteId = :remoteId WHERE id = :id")
    suspend fun markSynced(id: Long, syncedAt: Long, remoteId: String)
    
    @Query("DELETE FROM reactions")
    suspend fun deleteAll()
}
