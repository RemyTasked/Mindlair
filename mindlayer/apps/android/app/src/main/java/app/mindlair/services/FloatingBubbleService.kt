package app.mindlair.services

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import androidx.core.app.NotificationCompat
import app.mindlair.MindlairApplication
import app.mindlair.R
import app.mindlair.models.CapturedContent
import app.mindlair.models.Reaction
import app.mindlair.models.Stance
import app.mindlair.ui.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class FloatingBubbleService : Service() {
    
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val database by lazy { MindlairApplication.instance.database }
    
    private lateinit var windowManager: WindowManager
    private var bubbleView: View? = null
    private var expandedView: View? = null
    private var currentContent: CapturedContent? = null
    
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    
    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> {
                val content = intent.getParcelableExtra<CapturedContent>(EXTRA_CONTENT)
                if (content != null) {
                    currentContent = content
                    showBubble()
                }
            }
            ACTION_DISMISS -> {
                dismissBubble()
            }
        }
        
        startForeground(NOTIFICATION_ID, createNotification())
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        removeBubbleViews()
        scope.cancel()
    }
    
    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, MindlairApplication.CHANNEL_CAPTURE)
            .setContentTitle(getString(R.string.capture_active))
            .setContentText(getString(R.string.items_pending, 0))
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
    
    private fun showBubble() {
        if (bubbleView != null) return
        if (!Settings.canDrawOverlays(this)) {
            Log.w(TAG, "Overlay permission not granted")
            return
        }
        
        val inflater = LayoutInflater.from(this)
        bubbleView = inflater.inflate(R.layout.bubble_collapsed, null)
        
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = 0
            y = 200
        }
        
        bubbleView?.setOnTouchListener(BubbleTouchListener(params))
        bubbleView?.setOnClickListener { showExpanded() }
        
        windowManager.addView(bubbleView, params)
    }
    
    private fun showExpanded() {
        val content = currentContent ?: return
        if (expandedView != null) return
        
        val inflater = LayoutInflater.from(this)
        expandedView = inflater.inflate(R.layout.bubble_expanded, null)
        
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }
        
        expandedView?.apply {
            findViewById<TextView>(R.id.title)?.text = content.title
            findViewById<TextView>(R.id.source)?.text = "${content.source} • ${content.author ?: ""}"
            
            findViewById<Button>(R.id.btn_agree)?.setOnClickListener {
                submitReaction(Stance.AGREE)
            }
            findViewById<Button>(R.id.btn_disagree)?.setOnClickListener {
                submitReaction(Stance.DISAGREE)
            }
            findViewById<Button>(R.id.btn_complicated)?.setOnClickListener {
                submitReaction(Stance.COMPLICATED)
            }
            findViewById<Button>(R.id.btn_dismiss)?.setOnClickListener {
                dismissExpanded()
            }
            findViewById<ImageView>(R.id.btn_close)?.setOnClickListener {
                dismissExpanded()
            }
        }
        
        bubbleView?.visibility = View.GONE
        windowManager.addView(expandedView, params)
    }
    
    private fun submitReaction(stance: Stance) {
        val content = currentContent ?: return
        val noteField = expandedView?.findViewById<EditText>(R.id.note_input)
        val note = noteField?.text?.toString()?.trim()?.ifBlank { null }
        
        scope.launch {
            try {
                val reaction = Reaction(
                    contentId = content.id,
                    stance = stance,
                    note = note
                )
                database.reactionDao().insert(reaction)
                Log.d(TAG, "Reaction saved: $stance for ${content.title}")
            } catch (e: Exception) {
                Log.e(TAG, "Error saving reaction", e)
            }
        }
        
        dismissExpanded()
        dismissBubble()
    }
    
    private fun dismissExpanded() {
        expandedView?.let {
            windowManager.removeView(it)
            expandedView = null
        }
        bubbleView?.visibility = View.VISIBLE
    }
    
    private fun dismissBubble() {
        removeBubbleViews()
        currentContent = null
        stopSelf()
    }
    
    private fun removeBubbleViews() {
        bubbleView?.let {
            windowManager.removeView(it)
            bubbleView = null
        }
        expandedView?.let {
            windowManager.removeView(it)
            expandedView = null
        }
    }
    
    private inner class BubbleTouchListener(
        private val params: WindowManager.LayoutParams
    ) : View.OnTouchListener {
        
        override fun onTouch(v: View, event: MotionEvent): Boolean {
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = initialX - (event.rawX - initialTouchX).toInt()
                    params.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager.updateViewLayout(bubbleView, params)
                    return true
                }
                MotionEvent.ACTION_UP -> {
                    val deltaX = event.rawX - initialTouchX
                    val deltaY = event.rawY - initialTouchY
                    if (deltaX * deltaX + deltaY * deltaY < 100) {
                        v.performClick()
                    }
                    return true
                }
            }
            return false
        }
    }
    
    companion object {
        private const val TAG = "FloatingBubbleService"
        private const val NOTIFICATION_ID = 1001
        
        const val ACTION_SHOW = "app.mindlair.action.SHOW_BUBBLE"
        const val ACTION_DISMISS = "app.mindlair.action.DISMISS_BUBBLE"
        const val EXTRA_CONTENT = "content"
        
        fun showBubble(context: Context, content: CapturedContent) {
            if (!Settings.canDrawOverlays(context)) return
            
            val intent = Intent(context, FloatingBubbleService::class.java).apply {
                action = ACTION_SHOW
                putExtra(EXTRA_CONTENT, content)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun dismissBubble(context: Context) {
            val intent = Intent(context, FloatingBubbleService::class.java).apply {
                action = ACTION_DISMISS
            }
            context.startService(intent)
        }
    }
}
