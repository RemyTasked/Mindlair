package app.mindlair.services

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import app.mindlair.MindlairApplication
import app.mindlair.R
import app.mindlair.ui.MainActivity

class AudioCaptureService : Service() {

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "AudioCaptureService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startCapture()
            ACTION_STOP -> stopCapture()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        stopCapture()
    }

    private fun startCapture() {
        startForeground(NOTIFICATION_ID, createNotification())
        Log.d(TAG, "Audio capture started (placeholder)")
    }

    private fun stopCapture() {
        Log.d(TAG, "Audio capture stopped")
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, MindlairApplication.CHANNEL_CAPTURE)
            .setContentTitle("Audio Capture Active")
            .setContentText("Listening for podcast identification...")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val TAG = "AudioCaptureService"
        private const val NOTIFICATION_ID = 1002

        const val ACTION_START = "app.mindlair.action.START_AUDIO_CAPTURE"
        const val ACTION_STOP = "app.mindlair.action.STOP_AUDIO_CAPTURE"

        fun start(context: Context) {
            val intent = Intent(context, AudioCaptureService::class.java).apply {
                action = ACTION_START
            }
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, AudioCaptureService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }
}
