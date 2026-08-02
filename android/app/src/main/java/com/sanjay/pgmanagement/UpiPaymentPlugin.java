package com.sanjay.pgmanagement;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
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

    @ActivityCallback
    private void paymentReturned(PluginCall call, ActivityResult result) {
        JSObject response = new JSObject();
        response.put("returned", true);
        response.put("androidResultCode", result.getResultCode() == Activity.RESULT_OK ? "OK" : "RETURNED");
        call.resolve(response);
    }
}
