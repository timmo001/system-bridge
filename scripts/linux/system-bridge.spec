Name:           system-bridge
Version:        %{_version}
Release:        1%{?dist}
Summary:        System Bridge application

License:        MIT

%description
Bridge between your systems

%install
mkdir -p %{buildroot}/usr/bin
cp %{_builddir}/usr/bin/system-bridge %{buildroot}/usr/bin/

%files
/usr/bin/system-bridge

%changelog
* %(date "+%a %b %d %Y") System Bridge <maintainer@example.com> - %{_version}-1
- Initial package
