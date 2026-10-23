/* 单色 SVG 图标集：描边用 currentColor，自动跟随文字颜色，
   深色浅色都清晰；视觉重量远低于彩色 emoji，不会跟标题抢注意力。 */
var ICONS = {"home":"<path d=\"M3 10.5 12 3l9 7.5\"/><path d=\"M5.5 9.5V20a1 1 0 0 0 1 1H9.5v-6h5v6h3a1 1 0 0 0 1-1V9.5\"/>","practice":"<path d=\"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z\"/><path d=\"M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>","paper":"<path d=\"M6 3h8l4 4v14H6z\"/><path d=\"M14 3v4h4\"/><path d=\"M9 12h6M9 16h6\"/>","lib":"<path d=\"M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5z\"/><path d=\"M9 4h5.5A1.5 1.5 0 0 1 16 5.5v13a1.5 1.5 0 0 1-1.5 1.5H9z\"/><path d=\"M16 5.5h2A1.5 1.5 0 0 1 19.5 7v11\"/>","me":"<circle cx=\"12\" cy=\"8\" r=\"3.2\"/><path d=\"M4.8 20a7.2 7.2 0 0 1 14.4 0\"/>","add":"<path d=\"M12 5v14M5 12h14\"/>","search":"<circle cx=\"11\" cy=\"11\" r=\"6.2\"/><path d=\"m16 16 4 4\"/>","sound":"<path d=\"M4 9.5h3L12 5v14L7 14.5H4z\"/><path d=\"M15.5 9a4.2 4.2 0 0 1 0 6\"/>","edit":"<path d=\"M4 20h4l10-10-4-4L4 16z\"/><path d=\"m14.5 5.5 4 4\"/>","del":"<path d=\"M4 7h16\"/><path d=\"M9.5 7V4.5h5V7\"/><path d=\"M6.5 7l1 13h9l1-13\"/>","check":"<path d=\"m5 12.5 4.5 4.5L19 7\"/>","close":"<path d=\"M6 6l12 12M18 6 6 18\"/>","star":"<path d=\"m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z\"/>","clock":"<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M12 7.5V12l3 2\"/>","bulb":"<path d=\"M9 17h6\"/><path d=\"M10 20h4\"/><path d=\"M8.5 14A5.5 5.5 0 1 1 15.5 14c-.6.9-.5 1.6-.5 2.4H9c0-.8.1-1.5-.5-2.4Z\"/>","warn":"<path d=\"M12 4 2.8 20h18.4z\"/><path d=\"M12 10v4\"/><circle cx=\"12\" cy=\"17\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>","book":"<path d=\"M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5z\"/><path d=\"M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3\"/>","download":"<path d=\"M12 4v11\"/><path d=\"m7.5 10.5 4.5 4.5 4.5-4.5\"/><path d=\"M4 19h16\"/>","upload":"<path d=\"M12 16V5\"/><path d=\"m7.5 9.5 4.5-4.5 4.5 4.5\"/><path d=\"M4 19h16\"/>","cloud":"<path d=\"M7 18a4 4 0 0 1-.6-7.9A5.5 5.5 0 0 1 17.5 9.6 3.7 3.7 0 0 1 17 18z\"/>","gear":"<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.2M17.6 15.3l2.2 1.2M4.2 16.5l2.2-1.2M17.6 8.7l2.2-1.2\"/>","refresh":"<path d=\"M20 12a8 8 0 1 1-2.6-5.9\"/><path d=\"M20 4v4.5h-4.5\"/>","tag":"<path d=\"M3.5 11.2V4.5a1 1 0 0 1 1-1h6.7a1 1 0 0 1 .7.3l7.3 7.3a1 1 0 0 1 0 1.4l-6.7 6.7a1 1 0 0 1-1.4 0L3.8 11.9a1 1 0 0 1-.3-.7Z\"/><circle cx=\"7.8\" cy=\"7.8\" r=\"1.3\"/>","filter":"<path d=\"M4 5h16l-6.2 7.4V19l-3.6-2v-4.6z\"/>","arrowUp":"<path d=\"M12 19V6\"/><path d=\"m6.5 11.5 5.5-5.5 5.5 5.5\"/>","chart":"<path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/>","target":"<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><circle cx=\"12\" cy=\"12\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/>","key":"<circle cx=\"8\" cy=\"12\" r=\"3.2\"/><path d=\"m11 12 9 0M17 12v3M20 12v2.5\"/>","shield":"<path d=\"M12 3 5 6v6c0 4.2 3 7.4 7 9 4-1.6 7-4.8 7-9V6z\"/>","layers":"<path d=\"m12 3 9 5-9 5-9-5z\"/><path d=\"m3 13 9 5 9-5\"/>","play":"<path d=\"M7 4.5 19 12 7 19.5z\"/>"};

/* 生成内联 SVG。size 默认 20，stroke 粗细按尺寸自适应：
   小图标要粗一点才看得清，大图标细一点更精致。 */
function icon(name, size, sw) {
  var d = ICONS[name];
  if (!d) return '';
  size = size || 20;
  sw = sw || (size >= 24 ? 1.6 : (size <= 16 ? 1.9 : 1.7));
  return '<svg class="ic" viewBox="0 0 24 24" width="' + size + '" height="' + size +
    '" fill="none" stroke="currentColor" stroke-width="' + sw +
    '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
}

/* 把文案里的 emoji 换成单色图标（用于标题等处） */
var EMOJI2ICON = {
  '🏠':'home','🎯':'practice','📝':'paper','📖':'lib','⚙️':'me',
  '➕':'add','🔍':'search','🔊':'sound','✏️':'edit','🗑':'del','✓':'check','✕':'close',
  '⭐':'star','🕐':'clock','💡':'bulb','⚠️':'warn','📚':'book','📥':'download','📤':'upload',
  '☁️':'cloud','🔄':'refresh','🏷':'tag','📅':'clock','📊':'chart','🔑':'key','🔤':'book',
  '💬':'book','🛠':'gear','🔧':'gear','📌':'tag','💾':'download','👤':'me','🎚':'gear',
  '📗':'book','📋':'paper','👋':'home','🖼️':'paper','📄':'paper','🎧':'sound','🎓':'book'
};

/* 把一段文字开头的 emoji 替换为图标；找不到对应图标就原样保留 */
function deEmoji(s) {
  if (!s) return s;
  var keys = Object.keys(EMOJI2ICON);
  for (var i = 0; i < keys.length; i++) {
    if (s.indexOf(keys[i]) === 0) {
      return icon(EMOJI2ICON[keys[i]], 18) + '<span style="margin-left:6px"></span>' + s.slice(keys[i].length);
    }
  }
  return s;
}
