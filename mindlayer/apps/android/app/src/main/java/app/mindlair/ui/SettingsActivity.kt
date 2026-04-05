package app.mindlair.ui

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import app.mindlair.MindlairApplication
import app.mindlair.databinding.ActivitySettingsBinding
import kotlinx.coroutines.launch

class SettingsActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivitySettingsBinding
    private val api by lazy { MindlairApplication.instance.api }
    private val database by lazy { MindlairApplication.instance.database }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = getString(app.mindlair.R.string.settings)
        
        setupUI()
    }
    
    override fun onSupportNavigateUp(): Boolean {
        onBackPressedDispatcher.onBackPressed()
        return true
    }
    
    private fun setupUI() {
        binding.apply {
            btnSignOut.setOnClickListener {
                showSignOutDialog()
            }
            
            btnDeleteData.setOnClickListener {
                showDeleteDataDialog()
            }
        }
        
        lifecycleScope.launch {
            api.isLoggedIn.collect { loggedIn ->
                binding.btnSignOut.isEnabled = loggedIn
            }
        }
    }
    
    private fun showSignOutDialog() {
        AlertDialog.Builder(this)
            .setTitle("Sign out")
            .setMessage("Are you sure you want to sign out? Your unsynced data will be deleted.")
            .setPositiveButton("Sign out") { _, _ ->
                lifecycleScope.launch {
                    api.clearAuthToken()
                    database.capturedContentDao().deleteAll()
                    database.reactionDao().deleteAll()
                    Toast.makeText(this@SettingsActivity, "Signed out", Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showDeleteDataDialog() {
        AlertDialog.Builder(this)
            .setTitle("Delete local data")
            .setMessage("This will delete all captured content and reactions stored on this device. This cannot be undone.")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    database.capturedContentDao().deleteAll()
                    database.reactionDao().deleteAll()
                    Toast.makeText(this@SettingsActivity, "Local data deleted", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
