package com.sanjay.pgmanagement;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Apply status bar fix immediately and also delayed (after Capacitor bridge init)
        applyStatusBarFix();
        new Handler(Looper.getMainLooper()).postDelayed(this::applyStatusBarFix, 300);
        new Handler(Looper.getMainLooper()).postDelayed(this::applyStatusBarFix, 1000);
    }

    @Override
    public void onResume() {
        super.onResume();
        applyStatusBarFix();
    }

    private void applyStatusBarFix() {
        Window window = getWindow();
        // Force the content to fit within system window insets (below status bar)
        WindowCompat.setDecorFitsSystemWindows(window, true);
        // Remove any translucent/immersive flags
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        // Set the status bar to our theme blue
        window.setStatusBarColor(0xFF0E6CE7);
        // Clear any system UI visibility flags that hide the status bar
        View decorView = window.getDecorView();
        decorView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
    }
}
