package com.sanjay.pgmanagement;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativeContactPicker",
    permissions = {
        @Permission(
            alias = "contacts",
            strings = { Manifest.permission.READ_CONTACTS }
        )
    }
)
public class NativeContactPickerPlugin extends Plugin {

    @PluginMethod
    public void pickContact(PluginCall call) {
        if (getPermissionState("contacts") != PermissionState.GRANTED) {
            requestPermissionForAlias("contacts", call, "contactsPermCallback");
        } else {
            openContactPicker(call);
        }
    }

    @PermissionCallback
    private void contactsPermCallback(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            openContactPicker(call);
        } else {
            call.reject("Contact permission denied");
        }
    }

    private void openContactPicker(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
            startActivityForResult(call, intent, "pickContactResult");
        } catch (Exception e) {
            call.reject("Failed to open contact picker", e);
        }
    }

    @ActivityCallback
    private void pickContactResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri contactUri = result.getData().getData();
            if (contactUri != null) {
                String[] projection = new String[]{
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                };
                try (Cursor cursor = getContext().getContentResolver().query(contactUri, projection, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        int nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                        int numberIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                        
                        String name = nameIndex != -1 ? cursor.getString(nameIndex) : "";
                        String number = numberIndex != -1 ? cursor.getString(numberIndex) : "";

                        JSObject ret = new JSObject();
                        ret.put("name", name);
                        ret.put("phoneNumber", number);
                        call.resolve(ret);
                        return;
                    }
                } catch (Exception e) {
                    call.reject("Error reading contact details", e);
                    return;
                }
            }
        }
        call.reject("User cancelled contact picker");
    }
}
