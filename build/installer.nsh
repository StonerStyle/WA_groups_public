!macro customHeader
  Unicode true
  !define MUI_LANGDLL_ALLLANGUAGES
  !define MUI_LANGDLL_REGISTRY_ROOT "HKCU"
  !define MUI_LANGDLL_REGISTRY_KEY "Software\WhatsApp Group Scraper"
  !define MUI_LANGDLL_REGISTRY_VALUENAME "Installer Language"
  !define MUI_DIRECTORYPAGE_VARIABLE $INSTDIR
  !define MUI_DIRECTORYPAGE_DEFAULTDIR "C:\WhatsApp Group Scraper"
  !define MUI_RTL_LANGUAGE ${LANG_HEBREW}
!macroend

!macro customInstall
  WriteRegStr HKCU "Software\WhatsApp Group Scraper" "" $INSTDIR
!macroend

!macro preInit
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\WhatsApp Group Scraper"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\WhatsApp Group Scraper"
  SetRegView 32
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\WhatsApp Group Scraper"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\WhatsApp Group Scraper"
!macroend 