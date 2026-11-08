/**
 * The `scanQr` request's scanner: the camera full screen, read with zxing-cpp
 * until it finds a QR code, which it hands back as text. Back cancels. It
 * needs no Google Play services, unlike the WebView's BarcodeDetector.
 */
package dev.timmo.groundwork.shell

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContract
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import java.util.concurrent.Executors
import zxingcpp.BarcodeReader

class ScanActivity : ComponentActivity() {
  private val analysis = Executors.newSingleThreadExecutor()
  private var done = false

  override fun onCreate(savedInstanceState: Bundle?) {
    // Always light text on the camera, whatever the app's theme
    enableEdgeToEdge(SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT))
    super.onCreate(savedInstanceState)

    val preview = PreviewView(this).apply { scaleType = PreviewView.ScaleType.FILL_CENTER }
    val hint =
      TextView(this).apply {
        text = intent.getStringExtra(EXTRA_HINT) ?: "Point the camera at the QR code"
        setTextColor(Color.WHITE)
        setShadowLayer(8f, 0f, 0f, Color.BLACK)
        gravity = Gravity.CENTER
        textSize = 16f
      }
    val frame =
      FrameLayout(this).apply {
        setBackgroundColor(Color.BLACK)
        addView(preview, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        addView(
          hint,
          FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM),
        )
      }

    setContentView(frame)
    ViewCompat.setOnApplyWindowInsetsListener(hint) { view, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
      val space = (32 * resources.displayMetrics.density).toInt()
      view.updatePadding(left = bars.left + space, right = bars.right + space, bottom = bars.bottom + space)
      insets
    }

    start(preview)
  }

  private fun start(view: PreviewView) {
    val reader = BarcodeReader(BarcodeReader.Options(formats = setOf(BarcodeReader.Format.QR_CODE)))
    val providerFuture = ProcessCameraProvider.getInstance(this)

    providerFuture.addListener(
      {
        val provider = providerFuture.get()
        val preview = Preview.Builder().build().also { it.surfaceProvider = view.surfaceProvider }
        val imageAnalysis =
          ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()

        imageAnalysis.setAnalyzer(analysis) { image ->
          val text = image.use { runCatching { reader.read(it) }.getOrDefault(emptyList()) }.firstNotNullOfOrNull { it.text }

          if (text != null) runOnUiThread { finishWith(text) }
        }

        runCatching {
          // Phones scan with the back camera; tablets and laptops may only have a front one
          val camera =
            listOf(CameraSelector.DEFAULT_BACK_CAMERA, CameraSelector.DEFAULT_FRONT_CAMERA).first(provider::hasCamera)

          provider.unbindAll()
          provider.bindToLifecycle(this, camera, preview, imageAnalysis)
        }.onFailure { finishWith(null) }
      },
      mainExecutor,
    )
  }

  private fun finishWith(text: String?) {
    if (done) return
    done = true
    setResult(if (text == null) Activity.RESULT_CANCELED else Activity.RESULT_OK, Intent().putExtra(EXTRA_TEXT, text))
    finish()
  }

  override fun onDestroy() {
    analysis.shutdown()
    super.onDestroy()
  }

  /** Opens the scanner with an optional hint; the result is the QR code's text, or null. */
  class Scan : ActivityResultContract<String?, String?>() {
    override fun createIntent(context: Context, input: String?): Intent =
      Intent(context, ScanActivity::class.java).putExtra(EXTRA_HINT, input)

    override fun parseResult(resultCode: Int, intent: Intent?): String? =
      if (resultCode == Activity.RESULT_OK) intent?.getStringExtra(EXTRA_TEXT) else null
  }

  companion object {
    private const val EXTRA_HINT = "dev.timmo.groundwork.shell.SCAN_HINT"
    private const val EXTRA_TEXT = "dev.timmo.groundwork.shell.SCAN_TEXT"
  }
}
