; Windows 安装程序（Inno Setup 6）。由 GitHub Actions 调用：iscc /DAPPVER=0.1.0 gui\installer.iss
#ifndef APPVER
  #define APPVER "0.0.0"
#endif
[Setup]
AppId={{9B651DD2-1ED7-4858-8144-D7DB4C623510}
AppName=清静 · AiGoodBro
AppVersion={#APPVER}
AppPublisher=AiGoodBro
AppPublisherURL=https://github.com/BLACKIELF/qingjing-aigoodbro
DefaultDirName={autopf}\QingjingAiGoodBro
DefaultGroupName=清静 · AiGoodBro
DisableProgramGroupPage=yes
OutputDir=dist
OutputBaseFilename=Qingjing-AiGoodBro-{#APPVER}-windows-setup
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\AndroidAdCleaner.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
#if FileExists(AddBackslash(SourcePath) + "ChineseSimplified.isl")
Name: "zh"; MessagesFile: "ChineseSimplified.isl"
#else
Name: "en"; MessagesFile: "compiler:Default.isl"
#endif

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\AndroidAdCleaner\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\清静 · AiGoodBro"; Filename: "{app}\AndroidAdCleaner.exe"
Name: "{autodesktop}\清静 · AiGoodBro"; Filename: "{app}\AndroidAdCleaner.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\AndroidAdCleaner.exe"; Description: "{cm:LaunchProgram,清静 · AiGoodBro}"; Flags: nowait postinstall skipifsilent
