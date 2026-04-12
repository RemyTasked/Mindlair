package app.mindlair.ui

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import app.mindlair.MindlairApplication
import app.mindlair.R
import app.mindlair.databinding.ActivityMainBinding
import app.mindlair.services.AccessibilityCapture
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private val api by lazy { MindlairApplication.instance.api }
    private val database by lazy { MindlairApplication.instance.database }
    
    private val overlayPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        updatePermissionStatus()
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupUI()
        observeData()
        handleDeepLink(intent)
    }
    
    override fun onResume() {
        super.onResume()
        updatePermissionStatus()
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.let { handleDeepLink(it) }
    }
    
    private fun setupUI() {
        binding.apply {
            btnEnableAccessibility.setOnClickListener {
                openAccessibilitySettings()
            }
            
            btnEnableOverlay.setOnClickListener {
                requestOverlayPermission()
            }
            
            btnSettings.setOnClickListener {
                startActivity(Intent(this@MainActivity, SettingsActivity::class.java))
            }
            
            btnOpenWeb.setOnClickListener {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://mindlair.app/map"))
                startActivity(intent)
            }
        }
    }
    
    private fun observeData() {
        lifecycleScope.launch {
            database.capturedContentDao().getUnsyncedCountFlow().collectLatest { count ->
                binding.pendingCount.text = getString(R.string.items_pending, count)
            }
        }
        
        lifecycleScope.launch {
            api.isLoggedIn.collectLatest { loggedIn ->
                binding.loginStatus.text = if (loggedIn) "Signed in" else "Not signed in"
            }
        }
    }
    
    private fun updatePermissionStatus() {
        val accessibilityEnabled = isAccessibilityServiceEnabled()
        val overlayEnabled = Settings.canDrawOverlays(this)
        
        binding.apply {
            accessibilityStatus.text = if (accessibilityEnabled) "✓ Enabled" else "○ Disabled"
            accessibilityStatus.setTextColor(
                getColor(if (accessibilityEnabled) R.color.green else R.color.muted)
            )
            btnEnableAccessibility.isEnabled = !accessibilityEnabled
            
            overlayStatus.text = if (overlayEnabled) "✓ Enabled" else "○ Disabled"
            overlayStatus.setTextColor(
                getColor(if (overlayEnabled) R.color.green else R.color.muted)
            )
            btnEnableOverlay.isEnabled = !overlayEnabled
            
            val allEnabled = accessibilityEnabled && overlayEnabled
            captureActiveIndicator.setBackgroundColor(
                getColor(if (allEnabled) R.color.green else R.color.muted)
            )
            captureStatusText.text = if (allEnabled) {
                getString(R.string.capture_active)
            } else {
                getString(R.string.capture_paused)
            }
        }
    }
    
    private fun isAccessibilityServiceEnabled(): Boolean {
        val am = getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val enabledServices = am.getEnabledAccessibilityServiceList(
            AccessibilityServiceInfo.FEEDBACK_ALL_MASK
        )
        return enabledServices.any { 
            it.resolveInfo.serviceInfo.name == AccessibilityCapture::class.java.name 
        }
    }
    
    private fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        startActivity(intent)
        Toast.makeText(
            this,
            "Find 'Mindlair' and enable it",
            Toast.LENGTH_LONG
        ).show()
    }
    
    private fun requestOverlayPermission() {
        if (!Settings.canDrawOverlays(this)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            overlayPermissionLauncher.launch(intent)
        }
    }
    
    private fun handleDeepLink(intent: Intent) {
        val uri = intent.data ?: return
        
        when {
            uri.path?.contains("auth/callback") == true -> {
                val token = uri.getQueryParameter("token")
                if (token != null) {
                    lifecycleScope.launch {
                        api.setAuthToken(token)
                        Toast.makeText(
                            this@MainActivity,
                            "Signed in successfully!",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            }
        }
    }
}
