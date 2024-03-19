package com.bugsnag.reactnative.performance;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.bugsnag.reactnative.performance.NativeBugsnagPerformanceSpec;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import java.security.SecureRandom;

public class NativeBugsnagPerformanceImpl extends NativeBugsnagPerformanceSpec {
  
  static final String NAME = "BugsnagReactNativePerformance";
  
  private final SecureRandom random = new SecureRandom();

  public NativeBugsnagPerformanceImpl(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return NAME;
  }

  @Override
  public WritableMap getDeviceInfo() {
    WritableMap map = Arguments.createMap();
    try {
      ReactApplicationContext reactContext = getReactApplicationContext();
      String bundleIdentifier = reactContext.getPackageName();
      map.putString("bundleIdentifier", bundleIdentifier);
      PackageInfo packageInfo = reactContext.getPackageManager().getPackageInfo(bundleIdentifier, 0);
      map.putString("versionCode", Integer.toString(packageInfo.versionCode));
    } catch (Exception e) {
      // ignore
    }

    String arch = null;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      String[] supportedAbis = Build.SUPPORTED_ABIS;
      if (supportedAbis != null && supportedAbis.length > 0) {
        arch = abiToArchitecture(supportedAbis[0]);
      }
    } else {
      arch = abiToArchitecture(Build.CPU_ABI);
    }

    if (arch != null) {
      map.putString("arch", arch);
    }

    map.putString("model", Build.MODEL);

    return map;
  }

  @Override
  public String requestEntropy() {
    byte[] bytes = new byte[1024];
    random.nextBytes(bytes);

    StringBuilder hex = new StringBuilder(bytes.length * 2);
    for(byte b : bytes) {
        int byteValue = ((int)b & 0xff);
        if(byteValue < 16) {
            hex.append('0');
        }
        hex.append(Integer.toHexString(byteValue));
    }
    return hex.toString();
  }

  @Override
  public void requestEntropyAsync(Promise promise) {
    promise.resolve(requestEntropy());
  }

  @Nullable
  private String abiToArchitecture(@Nullable String abi) {
    if (abi == null) {
      return null;
    }

    switch (abi) {
      case "armeabi-v7a":
        return "arm32";
      case "arm64-v8a":
        return "arm64";
      case "x86":
        return "x86";
      case "x86_64":
        return "amd64";
      default:
        return null;
    }
  }
}
