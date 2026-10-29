{
  description = "A bridge for your systems";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      packages.${system} = rec {
        system-bridge = pkgs.callPackage ./nix/package.nix {
          src = self;
          version = "0-unstable-${self.shortRev or "dirty"}";
        };
        system-bridge-full = system-bridge.override { withOptionalTools = true; };
        default = system-bridge;
      };
    };
}
