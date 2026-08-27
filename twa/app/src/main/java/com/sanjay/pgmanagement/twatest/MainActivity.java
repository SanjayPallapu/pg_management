package com.sanjay.pgmanagement.twatest;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.widget.ImageView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.trusted.TrustedWebActivityDisplayMode;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import androidx.core.content.ContextCompat;
import com.google.androidbrowserhelper.trusted.TwaLauncher;
import com.google.androidbrowserhelper.trusted.splashscreens.SplashImageTransferTask;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "PGHubLauncher";
    private static final String DEFAULT_URL = "https://pgmanagee.vercel.app";
    private TwaLauncher mTwaLauncher;
    private boolean mLaunched = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        launchTwa();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        launchTwa();
    }

    private void launchTwa() {
        if (mLaunched && !isFinishing()) {
            return;
        }
        mLaunched = true;

        try {
            Uri launchUri = (getIntent() != null && getIntent().getData() != null)
                ? getIntent().getData()
                : Uri.parse(DEFAULT_URL);

            int primaryColor = ContextCompat.getColor(this, R.color.colorPrimary);

            TrustedWebActivityIntentBuilder twaBuilder = new TrustedWebActivityIntentBuilder(launchUri)
                .setNavigationBarColor(primaryColor)
                .setToolbarColor(primaryColor)
                .setDisplayMode(new TrustedWebActivityDisplayMode.DefaultMode());

            SplashImageTransferTask splashImageTransferTask = new SplashImageTransferTask(
                this,
                R.drawable.splash,
                primaryColor,
                ImageView.ScaleType.CENTER,
                getPackageName() + ".fileprovider"
            );

            mTwaLauncher = new TwaLauncher(this);
            mTwaLauncher.launch(twaBuilder, null, splashImageTransferTask, null);
        } catch (Exception e) {
            Log.e(TAG, "TwaLauncher error, launching fallback CustomTabsIntent", e);
            try {
                int primaryColor = ContextCompat.getColor(this, R.color.colorPrimary);
                CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                    .setShowTitle(false)
                    .setToolbarColor(primaryColor)
                    .build();
                customTabsIntent.launchUrl(this, Uri.parse(DEFAULT_URL));
            } catch (Exception ex) {
                Log.e(TAG, "CustomTabs fallback failed, opening browser intent", ex);
                try {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(DEFAULT_URL));
                    startActivity(browserIntent);
                } catch (Exception ignored) {
                }
            }
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mTwaLauncher != null) {
            mTwaLauncher.destroy();
        }
    }
}
