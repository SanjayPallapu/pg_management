package com.sanjay.pgmanagement;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

@CapacitorPlugin(name = "UpiPayment")
public class UpiPaymentPlugin extends Plugin {
    private Intent paymentIntent(String uri) {
        return new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
    }

    @PluginMethod
    public void getCompatibleApps(PluginCall call) {
        String uri = call.getString("uri");
        if (uri == null || !uri.startsWith("upi://pay?")) { call.reject("INVALID_UPI_URI"); return; }
        PackageManager pm = getContext().getPackageManager();
        List<ResolveInfo> matches = pm.queryIntentActivities(paymentIntent(uri), PackageManager.MATCH_DEFAULT_ONLY);
        JSArray apps = new JSArray();
        for (ResolveInfo match : matches) {
            JSObject app = new JSObject();
            app.put("packageName", match.activityInfo.packageName);
            app.put("label", String.valueOf(match.loadLabel(pm)));
            apps.put(app);
        }
        JSObject result = new JSObject(); result.put("apps", apps); call.resolve(result);
    }

    @PluginMethod
    public void launch(PluginCall call) {
        String uri = call.getString("uri");
        String packageName = call.getString("packageName");
        boolean forceChooser = Boolean.TRUE.equals(call.getBoolean("forceChooser", true));
        if (uri == null || !uri.startsWith("upi://pay?")) { call.reject("INVALID_UPI_URI"); return; }
        Intent intent = paymentIntent(uri);
        PackageManager pm = getContext().getPackageManager();
        if (packageName != null && !packageName.isEmpty()) {
            intent.setPackage(packageName);
            if (intent.resolveActivity(pm) == null) { intent = paymentIntent(uri); forceChooser = true; }
        }
        if (intent.resolveActivity(pm) == null) { call.reject("NO_UPI_APP"); return; }
        Intent launchIntent = forceChooser ? Intent.createChooser(intent, "Pay with UPI") : intent;
        startActivityForResult(call, launchIntent, "paymentReturned");
    }

    @PluginMethod
    public void launchForUpiId(PluginCall call) {
        String packageName = call.getString("packageName");
        String upiId = call.getString("upiId");
        if (packageName == null || packageName.isEmpty()) { call.reject("NO_UPI_APP"); return; }
        if (upiId == null || upiId.length() > 196 || !upiId.matches("^[a-zA-Z0-9._-]{2,128}@[a-zA-Z0-9.-]{2,64}$")) {
            call.reject("INVALID_UPI_ID");
            return;
        }

        PackageManager pm = getContext().getPackageManager();
        Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
        if (launchIntent == null) { call.reject("NO_UPI_APP"); return; }

        ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        clipboard.setPrimaryClip(ClipData.newPlainText("UPI ID", upiId));
        startActivityForResult(call, launchIntent, "paymentReturned");
    }

    @ActivityCallback
    private void paymentReturned(PluginCall call, ActivityResult result) {
        if (call.getString("upiId") != null) {
            ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                clipboard.clearPrimaryClip();
            } else {
                clipboard.setPrimaryClip(ClipData.newPlainText("", ""));
            }
        }
        JSObject response = new JSObject();
        response.put("returned", true);
        response.put("androidResultCode", result.getResultCode() == Activity.RESULT_OK ? "OK" : "RETURNED");
        call.resolve(response);
    }
}
