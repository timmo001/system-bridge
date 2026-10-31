{
  lib,
  stdenvNoCC,
  buildGoModule,
  bun,
  nodejs,
  pkg-config,
  installShellFiles,
  makeWrapper,
  coreutils,
  libX11,
  libXi,
  libXtst,
  libxkbcommon,
  alsa-utils,
  ddcutil,
  lm_sensors,
  pciutils,
  pipewire,
  pulseaudio,
  zenity,
  src,
  version,
  withOptionalTools ? false,
}:

let
  # Bun's dependencies for the web client, fetched with network access, so
  # their hash changes whenever bun.lock does
  webClientModules = stdenvNoCC.mkDerivation {
    pname = "system-bridge-web-client-modules";
    inherit version src;

    nativeBuildInputs = [ bun ];

    dontConfigure = true;

    buildPhase = ''
      runHook preBuild
      export HOME="$TMPDIR"
      bun install --frozen-lockfile --ignore-scripts --no-progress --filter ./client/web
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall
      mkdir -p "$out"
      find . -type d -name node_modules -prune -exec cp -R --parents {} "$out" \;
      runHook postInstall
    '';

    dontFixup = true;

    outputHash = "sha256-uysYEWqwDIH9A7xtIbCM69YVFdvCkM6ul5O+QpQrSnE=";
    outputHashAlgo = "sha256";
    outputHashMode = "recursive";
  };

  webClient = stdenvNoCC.mkDerivation {
    pname = "system-bridge-web-client";
    inherit version src;

    nativeBuildInputs = [
      bun
      nodejs
    ];

    configurePhase = ''
      runHook preConfigure
      cp -R ${webClientModules}/. .
      chmod -R u+w .
      patchShebangs node_modules
      runHook postConfigure
    '';

    buildPhase = ''
      runHook preBuild
      export HOME="$TMPDIR"
      cd client/web
      bun run build
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall
      cp -R dist "$out"
      runHook postInstall
    '';
  };
in
buildGoModule {
  pname = "system-bridge";
  inherit version src;

  # Vendoring drops robotgo's C headers, which sit in directories without Go
  # files, so build from the module cache instead
  proxyVendor = true;
  vendorHash = "sha256-CysTJlKoZ0w6q++QDnCLNDyN1rkjo3PCkMu3tCGR5z8=";

  subPackages = [ "." ];

  nativeBuildInputs = [
    pkg-config
    installShellFiles
  ]
  ++ lib.optional withOptionalTools makeWrapper;

  # libXi provides the XInput header that XTest.h includes
  buildInputs = [
    libX11
    libXi
    libXtst
    libxkbcommon
  ];

  env.CGO_ENABLED = 1;

  ldflags = [
    "-s"
    "-w"
    "-X github.com/timmo001/system-bridge/version.Version=${version}"
  ];

  preBuild = ''
    rm -rf client/web/dist
    cp -R ${webClient} client/web/dist
  '';

  # The tests read live hardware and desktop state
  doCheck = false;

  postInstall = ''
    export HOME="$TMPDIR"
    for shell in bash zsh fish; do
      $out/bin/system-bridge completions $shell >system-bridge.$shell
    done
    installShellCompletion --cmd system-bridge \
      --bash system-bridge.bash \
      --zsh system-bridge.zsh \
      --fish system-bridge.fish

    install -Dm644 .scripts/linux/system-bridge.desktop $out/share/applications/system-bridge.desktop
    substituteInPlace $out/share/applications/system-bridge.desktop \
      --replace-fail /usr/bin/system-bridge $out/bin/system-bridge
    install -Dm644 .scripts/linux/60-system-bridge-rapl.rules $out/lib/udev/rules.d/60-system-bridge-rapl.rules
    substituteInPlace $out/lib/udev/rules.d/60-system-bridge-rapl.rules \
      --replace-fail /bin/chmod ${coreutils}/bin/chmod
    install -Dm644 .resources/system-bridge-dimmed.svg $out/share/icons/hicolor/scalable/apps/system-bridge.svg
    for size in 16 32 48 128 256 512; do
      install -Dm644 .resources/system-bridge-dimmed-$size.png \
        $out/share/icons/hicolor/''${size}x''${size}/apps/system-bridge.png
    done
  ''
  # Appended, so tools the system already provides still come first
  + lib.optionalString withOptionalTools ''
    wrapProgram $out/bin/system-bridge \
      --suffix PATH : ${
        lib.makeBinPath [
          alsa-utils
          ddcutil
          lm_sensors
          pciutils
          pipewire
          pulseaudio
          zenity
        ]
      }
  '';

  passthru = { inherit webClient webClientModules; };

  meta = {
    description = "A bridge for your systems";
    homepage = "https://github.com/timmo001/system-bridge";
    license = lib.licenses.asl20;
    mainProgram = "system-bridge";
    platforms = [ "x86_64-linux" ];
  };
}
