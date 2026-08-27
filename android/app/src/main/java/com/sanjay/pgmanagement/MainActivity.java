package com.sanjay.pgmanagement;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import androidx.browser.customtabs.CustomTabsIntent;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class MainActivity extends LauncherActivity {
    private static final String TAG = "PGHubLauncher";
    private static final String DEFAULT_URL = "https://pgmanagee.vercel.app";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        try {
            super.onCreate(savedInstanceState);
        } catch (Exception e) {
            Log.e(TAG, "LauncherActivity startup error, launching fallback CustomTab", e);
            launchFallback();
        }
    }

    private void launchFallback() {
        try {
            CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                .setShowTitle(false)
                .setToolbarColor(0xFF0062FF)
                .build();
            customTabsIntent.launchUrl(this, Uri.parse(DEFAULT_URL));
            finish();
        } catch (Exception e) {
            Log.e(TAG, "CustomTabs fallback failed, opening standard browser intent", e);
            try {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(DEFAULT_URL));
                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(browserIntent);
            } catch (Exception ignored) {
            }
            finish();
        }
    }
}
