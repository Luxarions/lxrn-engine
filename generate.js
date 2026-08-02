// generate.js
const fs = require('fs');
const path = require('path');

// ======================== KONFIGURASI ========================
const PROJECT_ROOT = __dirname;
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const CONFIG_DIR = path.join(PROJECT_ROOT, 'config');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const EXAMPLES_DIR = path.join(PROJECT_ROOT, 'examples');
const TESTS_DIR = path.join(PROJECT_ROOT, 'tests');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');
const HTML_DIR = path.join(EXAMPLES_DIR, 'html');

// Daftar semua file berdasarkan struktur yang diberikan
const fileStructure = {
  // root files
  root: [
    'index.js', 'package.json', '.env', '.gitignore', '.eslintrc.json',
    '.prettierrc', 'Dockerfile', 'docker-compose.yml', 'CHANGELOG.md',
    'LICENSE', 'README.md'
  ],
  // config
  config: ['default.json', 'development.json', 'production.json'],
  // docs
  docs: ['README.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md', 'API_REFERENCE.md', 'GETTING_STARTED.md'],
  'docs/api': ['README.md', 'core.md', 'network.md', 'resource.md', 'scene.md', 'crypto.md', 'extension.md', 'graphics.md', 'threading.md', 'utils.md'],
  // examples
  examples: [
    'basic_server.js', 'chat_app.js', 'game_server.js', 'multiplayer_demo.js',
    'resource_loader_demo.js', 'websocket_demo.js', 'crypto_demo.js',
    'threading_demo.js', 'scene_demo.js', 'web_client.html'
  ],
  // html (semua file .html)
  'examples/html': [
    'index.html', 'dashboard.html', 'debug.html', 'scene_viewer.html',
    'network_monitor.html', 'resource_browser.html', 'profiler.html',
    'log_viewer.html', 'settings.html', 'about.html', 'tree_viewer.html',
    'shader_editor.html', 'animation_editor.html', 'particle_editor.html',
    'material_editor.html', 'light_editor.html', 'physics_debug.html',
    'navigation_debug.html', 'audio_mixer.html', 'input_tester.html',
    'multiplayer_lobby.html', 'server_console.html', 'client_launcher.html',
    'asset_preview.html', 'build_pipeline.html', 'test_runner.html',
    'coverage_report.html', 'benchmark_results.html', 'api_explorer.html',
    'extension_manager.html', 'plugin_store.html', 'user_guide.html',
    'changelog_viewer.html', 'license_viewer.html', 'help.html',
    'console.html', 'status.html', 'metrics.html', 'alerts.html',
    'backup_restore.html', 'user_manager.html', 'role_manager.html',
    'permission_manager.html', 'audit_log.html', 'config_editor.html',
    'feature_flags.html', 'secret_manager.html', 'health_check.html',
    'service_status.html', 'queue_monitor.html', 'job_scheduler.html',
    'worker_pool.html', 'cache_manager.html', 'search_dashboard.html',
    'analytics_dashboard.html', 'payment_dashboard.html',
    'subscription_manager.html', 'invoice_viewer.html',
    'notification_center.html', 'email_templates.html', 'sms_logs.html',
    'push_notifications.html', 'file_manager.html', 'storage_browser.html',
    'cdn_manager.html', 'sync_dashboard.html', 'collaboration.html',
    'workflow_builder.html', 'report_builder.html', 'chart_builder.html',
    'form_builder.html', 'table_builder.html', 'crud_generator.html',
    'api_tester.html', 'websocket_tester.html', 'graphql_playground.html',
    'oauth_test.html', 'jwt_tester.html', 'encryption_tool.html',
    'hashing_tool.html', 'random_generator.html', 'uuid_generator.html',
    'qrcode_generator.html', 'barcode_generator.html', 'image_editor.html',
    'color_picker.html', 'typography_tester.html', 'icon_browser.html',
    'theme_customizer.html', 'layout_builder.html', 'grid_system.html',
    'responsive_tester.html', 'accessibility_checker.html', 'seo_analyzer.html',
    'performance_audit.html', 'security_scanner.html', 'vulnerability_report.html',
    'gdpr_compliance.html', 'cookie_consent.html', 'privacy_policy.html',
    'terms_of_service.html', 'eula.html'
  ],
  // tests
  tests: [
    'run_all.js', 'test_core.js', 'test_network.js', 'test_resource.js',
    'test_utils.js', 'test_crypto.js', 'test_extension.js', 'test_scene.js',
    'test_threading.js', 'test_graphics.js', 'test_i18n.js'
  ],
  // scripts
  scripts: [
    'build.js', 'deploy.js', 'test_coverage.js', 'benchmark.js',
    'generate_docs.js', 'lint.js'
  ],
  // src subdirectories (daftar file per direktori)
  'src/core': [
    'Compression.js', 'Constants.js', 'DeltaEncoding.js', 'DTLSServer.js',
    'Error.js', 'EventEmitter.js', 'IP.js', 'IPAddress.js', 'MissingResource.js',
    'NetSocket.js', 'PacketPeer.js', 'PacketPeerDTLS.js', 'PacketPeerUDP.js',
    'ResourceImporter.js', 'ResourceUID.js', 'SocketServer.js', 'StreamPeer.js',
    'StreamPeerGZip.js', 'StreamPeerSocket.js', 'StreamPeerTCP.js',
    'StreamPeerTLS.js', 'StreamPeerUDS.js', 'TCPServer.js', 'UDPServer.js',
    'ZipIO.js'
  ],
  'src/crypto': [
    'AESContext.js', 'Crypto.js', 'CryptoCore.js', 'CryptoResourceFormat.js',
    'HashingContext.js', 'RSAContext.js', 'ECDSAContext.js', 'X509Certificate.js',
    'SecureRandom.js', 'CryptoUtils.js'
  ],
  'src/extension': [
    'AndroidPluginManager.js', 'ExtensionFunctionLoader.js', 'ExtensionInstance.js',
    'ExtensionInterface.js', 'ExtensionLibraryLoader.js', 'ExtensionLoader.js',
    'ExtensionManager.js', 'ExtensionResourceFormat.js', 'JNIBridge.js',
    'NativeExtension.js', 'PluginSystem.js'
  ],
  'src/graphics': [
    'Image.js', 'ImageCompat.js', 'ImageLoader.js', 'ImageResourceFormat.js',
    'Color.js', 'Texture.js', 'Font.js', 'Shader.js', 'RenderTarget.js',
    'GraphicsContext.js', 'GraphicsUtils.js'
  ],
  'src/i18n': [
    'TranslationLoaderPO.js', 'TranslationLoaderCSV.js', 'TranslationLoaderJSON.js',
    'TranslationLoaderXML.js', 'TranslationManager.js', 'TranslationUtils.js'
  ],
  'src/network': [
    'HTTPClient.js', 'HTTPClientTCP.js', 'MultiplayerAPI.js', 'RemoteFilesystemClient.js',
    'WebSocketClient.js', 'WebSocketServer.js', 'NetworkManager.js', 'PacketQueue.js',
    'ConnectionManager.js', 'NetworkProtocol.js', 'NetworkUtils.js'
  ],
  'src/resource': [
    'DirAccess.js', 'FileAccessCompressed.js', 'FileAccessEncrypted.js',
    'FileAccessMemory.js', 'FileAccessPack.js', 'FileAccessPatched.js',
    'FileAccessZip.js', 'PackedDataContainer.js', 'PCKPacker.js',
    'Resource.js', 'ResourceFormatBinary.js', 'ResourceFormatJSON.js',
    'ResourceLoader.js', 'ResourceLoaderConstants.js', 'ResourcePreloader.js',
    'ResourceSaver.js', 'ResourceCache.js', 'ResourceManager.js',
    'ResourceValidator.js', 'ResourceUtils.js'
  ],
  'src/scene': [
    'CanvasItem.js', 'CanvasLayer.js', 'HTTPRequest.js', 'InstancePlaceholder.js',
    'MissingNode.js', 'MultiplayerPeer.js', 'Node.js', 'SceneTree.js',
    'SceneTreeFTI.js', 'SceneTreeFTITests.js', 'ShaderGlobalsOverride.js',
    'StatusIndicator.js', 'Timer.js', 'Viewport.js', 'Window.js',
    'Scene.js', 'SceneManager.js', 'NodeFactory.js', 'NodePath.js',
    'SceneImporter.js', 'SceneUtils.js'
  ],
  'src/threading': [
    'ConditionVariable.js', 'Mutex.js', 'RWLock.js', 'Semaphore.js',
    'SpinLock.js', 'Thread.js', 'ThreadSafe.js', 'ThreadPool.js',
    'TaskScheduler.js', 'AtomicCounter.js', 'ThreadUtils.js'
  ],
  'src/utils': [
    'ConfigFile.js', 'JSONParser.js', 'Keyboard.js', 'Logger.js',
    'MainLoop.js', 'Marshalls.js', 'Memory.js', 'OS.js', 'PlistParser.js',
    'ProcessID.js', 'Time.js', 'TimeEnums.js', 'XMLParser.js',
    'StringUtils.js', 'ArrayUtils.js', 'ObjectUtils.js', 'MathUtils.js',
    'PathUtils.js', 'URLUtils.js', 'BufferUtils.js', 'ValidationUtils.js',
    'PerformanceMonitor.js', 'Profiler.js', 'Debugger.js', 'EventUtils.js',
    'ErrorUtils.js'
  ],
  'src/audio': [
    'AudioStreamPlayer.js', 'AudioStreamPlayback.js', 'AudioEffect.js',
    'AudioServer.js', 'AudioStreamGenerator.js', 'AudioStreamOGG.js',
    'AudioStreamPlayer2D.js', 'AudioStreamPlayer3D.js', 'AudioListener.js',
    'AudioEffectAmplify.js', 'AudioEffectDelay.js', 'AudioEffectFilter.js',
    'AudioEffectPitchShift.js', 'AudioEffectReverb.js', 'AudioStream.js',
    'AudioStreamMP3.js', 'AudioStreamWAV.js', 'AudioStreamRandomizer.js'
  ],
  'src/physics': [
    'PhysicsServer.js', 'PhysicsBody.js', 'RigidBody.js', 'StaticBody.js',
    'CharacterBody.js', 'CollisionShape.js', 'CollisionPolygon.js',
    'Joint.js', 'RayCast.js', 'Area.js', 'PhysicsMaterial.js'
  ],
  'src/navigation': [
    'NavigationServer.js', 'NavigationAgent.js', 'NavigationMesh.js',
    'NavigationPath.js', 'NavigationObstacle.js', 'NavigationRegion.js'
  ],
  'src/animation': [
    'AnimationPlayer.js', 'AnimationTree.js', 'AnimationNode.js',
    'Tween.js', 'AnimationBlendTree.js', 'AnimationStateMachine.js',
    'AnimationTrack.js', 'Animation.js', 'Keyframe.js', 'Track.js',
    'BezierTrack.js', 'AudioTrack.js', 'MethodTrack.js', 'ValueTrack.js'
  ],
  'src/shader': [
    'ShaderMaterial.js', 'ShaderCompiler.js', 'ShaderLanguage.js',
    'VisualShader.js', 'ShaderPreprocessor.js', 'ShaderCache.js'
  ],
  'src/particles': [
    'ParticlesSystem.js', 'ParticlesMaterial.js', 'ParticlesEmitter.js',
    'CPUParticles.js', 'GPUParticles.js', 'ParticleTrails.js'
  ],
  'src/lighting': [
    'Light.js', 'DirectionalLight.js', 'PointLight.js', 'SpotLight.js',
    'OmniLight.js', 'Lightmap.js', 'ShadowMapping.js'
  ],
  'src/material': [
    'Material.js', 'StandardMaterial.js', 'SpatialMaterial.js',
    'CanvasItemMaterial.js', 'MaterialCache.js', 'MaterialLoader.js'
  ],
  'src/mesh': [
    'Mesh.js', 'MeshInstance.js', 'MeshLibrary.js', 'PlaneMesh.js',
    'BoxMesh.js', 'SphereMesh.js', 'CylinderMesh.js', 'CapsuleMesh.js',
    'TorusMesh.js', 'GridMesh.js', 'PrimitiveMesh.js', 'MeshImporter.js'
  ],
  'src/camera': [
    'Camera.js', 'Camera3D.js', 'Camera2D.js', 'OrthogonalCamera.js',
    'PerspectiveCamera.js', 'CameraController.js', 'CameraFollower.js'
  ],
  'src/input': [
    'Input.js', 'InputMap.js', 'InputEvent.js', 'InputEventKey.js',
    'InputEventMouse.js', 'InputEventTouch.js', 'InputEventJoypad.js',
    'InputEventGesture.js', 'InputEventAction.js'
  ],
  'src/gui': [
    'Control.js', 'Button.js', 'Label.js', 'TextEdit.js', 'LineEdit.js',
    'RichTextLabel.js', 'Panel.js', 'ScrollContainer.js', 'Tree.js',
    'ItemList.js', 'OptionButton.js', 'CheckBox.js', 'RadioButton.js',
    'Slider.js', 'ProgressBar.js', 'TabContainer.js', 'Popup.js',
    'PopupMenu.js', 'ColorPicker.js', 'FileDialog.js', 'Theme.js'
  ],
  'src/2d': [
    'Sprite2D.js', 'AnimatedSprite2D.js', 'TileMap.js', 'TileSet.js',
    'Polygon2D.js', 'Line2D.js', 'Path2D.js', 'PathFollow2D.js',
    'LightOccluder2D.js', 'VisibilityNotifier2D.js', 'ParallaxBackground.js'
  ],
  'src/3d': [
    'Spatial.js', 'MeshInstance3D.js', 'Sprite3D.js', 'MultiMesh.js',
    'Skeleton.js', 'Skin.js', 'Bone.js', 'Path3D.js', 'PathFollow3D.js',
    'VisibilityNotifier3D.js', 'GridMap.js'
  ],
  'src/physics_2d': [
    'Physics2DServer.js', 'PhysicsBody2D.js', 'RigidBody2D.js',
    'StaticBody2D.js', 'CharacterBody2D.js', 'CollisionShape2D.js',
    'CollisionPolygon2D.js', 'Joint2D.js', 'RayCast2D.js', 'Area2D.js',
    'PhysicsMaterial2D.js'
  ],
  'src/navigation_2d': [
    'Navigation2DServer.js', 'NavigationAgent2D.js', 'NavigationMesh2D.js',
    'NavigationPath2D.js', 'NavigationObstacle2D.js', 'NavigationRegion2D.js'
  ],
  'src/visual': [
    'VisualServer.js', 'Viewport.js', 'RenderTarget.js', 'RenderingDevice.js',
    'RenderingPipeline.js', 'Sky.js', 'Environment.js', 'Fog.js',
    'Decal.js', 'ReflectionProbe.js'
  ],
  'src/import': [
    'ResourceImporter.js', 'ImageImporter.js', 'MeshImporter.js',
    'AudioImporter.js', 'SceneImporter.js', 'TextureImporter.js',
    'MaterialImporter.js', 'FontImporter.js', 'GLTFImporter.js',
    'FBXImporter.js', 'OBJImporter.js', 'ColladaImporter.js',
    'WAVImporter.js', 'OGGImporter.js', 'MP3Importer.js', 'PNGImporter.js'
  ],
  'src/export': [
    'ResourceExporter.js', 'SceneExporter.js', 'GLTFExporter.js',
    'FBXExporter.js', 'OBJExporter.js', 'ImageExporter.js',
    'AudioExporter.js', 'MeshExporter.js'
  ],
  'src/server': [
    'GameServer.js', 'DedicatedServer.js', 'MatchmakingServer.js',
    'LobbyServer.js', 'RoomServer.js', 'PeerManager.js',
    'ServerBrowser.js', 'ServerDiscovery.js'
  ],
  'src/client': [
    'GameClient.js', 'WebClient.js', 'MobileClient.js',
    'DesktopClient.js', 'ClientManager.js'
  ],
  'src/multiplayer': [
    'MultiplayerAPI.js', 'MultiplayerPeer.js', 'NetworkedMultiplayer.js',
    'Synchronizer.js', 'Replicator.js', 'Interpolator.js',
    'Prediction.js', 'LagCompensation.js', 'StateSynchronization.js',
    'RemoteProcedure.js', 'RPCSender.js', 'RPCReceiver.js',
    'NetworkProfiler.js'
  ],
  'src/vr': [
    'VRServer.js', 'VRDevice.js', 'VRController.js', 'VRHMD.js',
    'VRHand.js', 'XRInterface.js', 'WebXRInterface.js',
    'OpenXRInterface.js', 'ARVRController.js', 'ARVROrigin.js',
    'XRAnchor.js'
  ],
  'src/ui': [
    'UIManager.js', 'UILayout.js', 'UITheme.js', 'UIStyle.js',
    'UIFont.js', 'UITexture.js', 'UIConstants.js', 'UIUtils.js',
    'UIAssets.js', 'UILoader.js'
  ],
  'src/rendering': [
    'Renderer.js', 'RenderPipeline.js', 'RenderPass.js',
    'RenderTarget.js', 'RenderBuffer.js', 'RenderQueue.js',
    'RenderState.js', 'RenderCommand.js', 'RenderBatch.js',
    'RenderDevice.js', 'RenderBackend.js', 'WebGLBackend.js',
    'WebGPUBackend.js', 'OpenGLBackend.js', 'VulkanBackend.js',
    'DirectXBackend.js'
  ],
  'src/postprocessing': [
    'PostProcessing.js', 'Bloom.js', 'SSR.js', 'SSAO.js',
    'FXAA.js', 'SMAA.js', 'MotionBlur.js', 'DOF.js',
    'HDR.js', 'ToneMapping.js', 'ColorCorrection.js',
    'Vignette.js', 'ChromaticAberration.js', 'PostProcessPass.js'
  ]
};

// ======================== TEMPLATE GENERATOR ========================
// Fungsi untuk menghasilkan konten file berdasarkan path dan nama
function generateFileContent(filePath, fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  const dir = path.dirname(filePath).replace(/^src[\\/]/, '').replace(/[\\/]/g, '_');

  // Untuk file .js
  if (ext === '.js') {
    // Tentukan namespace berdasarkan direktori
    let namespace = 'LXRN';
    const parts = filePath.split(path.sep);
    const srcIndex = parts.indexOf('src');
    if (srcIndex !== -1 && parts.length > srcIndex + 1) {
      const subDir = parts[srcIndex + 1];
      const cap = subDir.charAt(0).toUpperCase() + subDir.slice(1);
      namespace += `.${cap}`;
    } else {
      namespace += '.Core';
    }

    // Jika file di root src (tidak ada subdir)
    if (filePath.startsWith('src') && !filePath.includes(path.sep)) {
      namespace = 'LXRN.Core';
    }

    // Khusus untuk file di src/core
    if (filePath.startsWith('src/core')) {
      namespace = 'LXRN.Core';
    }

    // Kelas dasar: semua file .js adalah kelas dengan nama file
    const className = base;
    // Cari dependensi berdasarkan nama (sederhana)
    let deps = [];
    if (['Node', 'Resource', 'Object'].includes(className)) {
      // tidak perlu import
    } else if (className.includes('Server') || className.includes('Client')) {
      deps = ['EventEmitter', 'Logger'];
    } else if (className.includes('Manager') || className.includes('System')) {
      deps = ['EventEmitter', 'Logger'];
    } else {
      deps = ['Object'];
    }

    // Build imports
    let imports = '';
    deps.forEach(d => {
      const depPath = `./core/${d}.js`;
      imports += `const ${d} = require('${depPath}');\n`;
    });
    if (imports) imports += '\n';

    // Buat konten kelas dengan private fields (#) dan private methods (__)
    const privateFields = [];
    const privateMethods = [];
    // Contoh: tambahkan beberapa field umum
    if (className !== 'Object') {
      privateFields.push('  #_id = null;');
      privateFields.push('  #_name = "";');
      privateFields.push('  #_meta = {};');
    }
    if (className.includes('Manager') || className.includes('System')) {
      privateFields.push('  #_initialized = false;');
    }

    // Metode private contoh
    privateMethods.push(`
  /**
   * Private method (double underscore) untuk inisialisasi internal.
   * @param {Object} options
   */
  __init(options = {}) {
    this.#_id = options.id || LXRN.Utils.generateUUID();
    this.#_name = options.name || this.constructor.name;
    this.#_meta = options.meta || {};
  }`);

    if (className.includes('Manager')) {
      privateMethods.push(`
  /**
   * Private method untuk validasi state.
   */
  __validate() {
    if (!this.#_initialized) {
      throw new Error(\`\${this.#_name} belum diinisialisasi.\`);
    }
  }`);
    }

    // Buat konten
    let classBody = `
class ${className}${deps.length ? ` extends ${deps[0]}` : ''} {
${privateFields.join('\n')}

  constructor(options = {}) {
    ${deps.length ? `super(options);` : ''}
    this.__init(options);
    // registrasi otomatis
    if (typeof LXRN !== 'undefined' && LXRN.ClassDB) {
      LXRN.ClassDB.register(this.constructor.name, this.constructor);
    }
  }

${privateMethods.join('\n')}

  // Getter / Setter publik
  get id() { return this.#_id; }
  get name() { return this.#_name; }
  set name(val) { this.#_name = val; }
  get meta() { return this.#_meta; }

  toJSON() {
    return {
      id: this.#_id,
      name: this.#_name,
      meta: this.#_meta
    };
  }

  toString() {
    return \`[\${this.constructor.name} id=\${this.#_id} name="\${this.#_name}"]\`;
  }
}
`;
    // Tambahkan namespace dan export
    let fullCode = `${imports}${classBody}

// Registrasi namespace
if (typeof LXRN === 'undefined') {
  global.LXRN = {};
}
if (!LXRN.${namespace.split('.')[1]}) {
  LXRN.${namespace.split('.')[1]} = {};
}
LXRN.${namespace.split('.')[1]}.${className} = ${className};

module.exports = ${className};
`;
    return fullCode;
  }

  // Untuk file JSON
  if (ext === '.json') {
    if (fileName === 'package.json') {
      return JSON.stringify({
        name: 'lxrn-engine',
        version: '1.0.0',
        description: 'LXRN Engine - Full-featured game/application engine',
        main: 'index.js',
        scripts: {
          start: 'node index.js',
          test: 'node tests/run_all.js',
          build: 'node scripts/build.js',
          docs: 'node scripts/generate_docs.js',
          lint: 'node scripts/lint.js'
        },
        dependencies: {
          'ws': '^8.13.0',
          'express': '^4.18.2',
          'crypto': '^1.0.1',
          'zlib': '^1.0.5',
          'sharp': '^0.32.1'
        },
        devDependencies: {
          'eslint': '^8.45.0',
          'prettier': '^3.0.0',
          'jest': '^29.6.2'
        },
        author: 'LXRN Team',
        license: 'MIT'
      }, null, 2);
    }
    if (fileName === 'default.json' || fileName === 'development.json' || fileName === 'production.json') {
      return JSON.stringify({
        server: { port: 3000, host: '0.0.0.0' },
        logging: { level: 'info' },
        resources: { path: './assets' }
      }, null, 2);
    }
    return '{}';
  }

  // Untuk file .md
  if (ext === '.md') {
    return `# ${base.replace(/_/g, ' ').toUpperCase()}\n\nDokumentasi untuk ${base}.`;
  }

  // Untuk file .html
  if (ext === '.html') {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${base.replace(/_/g, ' ').toUpperCase()} - LXRN Engine</title>
  <style>
    body { font-family: sans-serif; margin: 20px; background: #1e1e2f; color: #fff; }
    h1 { color: #8be9fd; }
  </style>
</head>
<body>
  <h1>${base.replace(/_/g, ' ').toUpperCase()}</h1>
  <p>Halaman visual untuk ${base}.</p>
  <script>
    console.log('LXRN Engine - ${base}');
  </script>
</body>
</html>`;
  }

  // Untuk file lainnya (.env, .gitignore, dll)
  if (fileName === '.env') {
    return `PORT=3000\nNODE_ENV=development\nLOG_LEVEL=info\n`;
  }
  if (fileName === '.gitignore') {
    return `node_modules/\n.env\n*.log\ndist/\nbuild/\ncoverage/\n`;
  }
  if (fileName === '.eslintrc.json') {
    return JSON.stringify({
      env: { es2021: true, node: true },
      extends: 'eslint:recommended',
      parserOptions: { ecmaVersion: 12, sourceType: 'module' },
      rules: { indent: ['error', 2], 'linebreak-style': ['error', 'unix'], quotes: ['error', 'single'], semi: ['error', 'always'] }
    }, null, 2);
  }
  if (fileName === '.prettierrc') {
    return JSON.stringify({ singleQuote: true, trailingComma: 'es5', printWidth: 80, tabWidth: 2 }, null, 2);
  }
  if (fileName === 'Dockerfile') {
    return `FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nEXPOSE 3000\nCMD ["node", "index.js"]\n`;
  }
  if (fileName === 'docker-compose.yml') {
    return `version: '3.8'\nservices:\n  engine:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n`;
  }
  if (fileName === 'CHANGELOG.md') {
    return `# Changelog\n\n## 1.0.0 - 2026-08-02\n- Initial release\n`;
  }
  if (fileName === 'LICENSE') {
    return `MIT License\n\nCopyright (c) 2026 LXRN Engine\n\nPermission is hereby granted...\n`;
  }
  if (fileName === 'README.md') {
    return `# LXRN Engine\n\nFull-featured engine for games and applications.\n`;
  }
  if (fileName === 'index.js') {
    return `// LXRN Engine Entry Point\nconst LXRN = require('./src/core/LXRN.js');\n\n// Inisialisasi engine\nconst engine = new LXRN.Engine();\nengine.start();\n\nmodule.exports = engine;\n`;
  }

  // Fallback
  return `// ${fileName} - LXRN Engine\n`;
}

// ======================== BUAT FILE DAN DIREKTORI ========================
function createFile(filePath, content) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Created: ${fullPath}`);
}

// Buat semua file
function generateAll() {
  // Root files
  fileStructure.root.forEach(f => createFile(f, generateFileContent(f, f)));

  // Config
  fileStructure.config.forEach(f => createFile(`config/${f}`, generateFileContent(`config/${f}`, f)));

  // Docs
  fileStructure.docs.forEach(f => createFile(`docs/${f}`, generateFileContent(`docs/${f}`, f)));
  fileStructure['docs/api'].forEach(f => createFile(`docs/api/${f}`, generateFileContent(`docs/api/${f}`, f)));

  // Examples
  fileStructure.examples.forEach(f => createFile(`examples/${f}`, generateFileContent(`examples/${f}`, f)));

  // HTML
  fileStructure['examples/html'].forEach(f => createFile(`examples/html/${f}`, generateFileContent(`examples/html/${f}`, f)));

  // Tests
  fileStructure.tests.forEach(f => createFile(`tests/${f}`, generateFileContent(`tests/${f}`, f)));

  // Scripts
  fileStructure.scripts.forEach(f => createFile(`scripts/${f}`, generateFileContent(`scripts/${f}`, f)));

  // SRC - semua direktori
  const srcDirs = Object.keys(fileStructure).filter(k => k.startsWith('src/') || k === 'src/core' || k === 'src/crypto' || k === 'src/extension' || k === 'src/graphics' || k === 'src/i18n' || k === 'src/network' || k === 'src/resource' || k === 'src/scene' || k === 'src/threading' || k === 'src/utils' || k === 'src/audio' || k === 'src/physics' || k === 'src/navigation' || k === 'src/animation' || k === 'src/shader' || k === 'src/particles' || k === 'src/lighting' || k === 'src/material' || k === 'src/mesh' || k === 'src/camera' || k === 'src/input' || k === 'src/gui' || k === 'src/2d' || k === 'src/3d' || k === 'src/physics_2d' || k === 'src/navigation_2d' || k === 'src/visual' || k === 'src/import' || k === 'src/export' || k === 'src/server' || k === 'src/client' || k === 'src/multiplayer' || k === 'src/vr' || k === 'src/ui' || k === 'src/rendering' || k === 'src/postprocessing');
  srcDirs.forEach(dir => {
    const files = fileStructure[dir] || [];
    files.forEach(f => {
      const filePath = `${dir}/${f}`;
      createFile(filePath, generateFileContent(filePath, f));
    });
  });

  console.log('\n🎉 Semua file telah dibuat!');
}

// Jalankan
generateAll();
