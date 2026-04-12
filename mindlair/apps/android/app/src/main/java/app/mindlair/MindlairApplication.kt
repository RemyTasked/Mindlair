package app.mindlair

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import app.mindlair.api.MindlairApi
import app.mindlair.db.CaptureDatabase

class MindlairApplication : Application() {
    
    lateinit var api: MindlairApi
        private set
    
    lateinit var database: CaptureDatabase
        private set
    
    override fun onCreate() {
        super.onCreate()
        instance = this
        
        api = MindlairApi.create(this)
        database = CaptureDatabase.getInstance(this)
        
        createNotificationChannels()
    }
    
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)
            
            // Capture status channel
            val captureChannel = NotificationChannel(
                CHANNEL_CAPTURE,
                getString(R.string.capture_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.capture_channel_description)
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(captureChannel)
            
            // Sync channel
            val syncChannel = NotificationChannel(
                CHANNEL_SYNC,
                getString(R.string.sync_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.sync_channel_description)
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(syncChannel)
        }
    }
    
    companion object {
        const val CHANNEL_CAPTURE = "capture_status"
        const val CHANNEL_SYNC = "sync"
        
        lateinit var instance: MindlairApplication
            private set
    }
}
