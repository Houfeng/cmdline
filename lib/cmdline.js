/**
 * cmdline.js - cmdline is a process.argv parser
 * @version v0.0.4
 * @link http://houfeng.net/cmdline
 * @license MIT
 * @author Houfeng
 * @email admin@xhou.net
 */
var utils=require("real-utils"),CommandLine=module.exports=function(o){var t=this;t.opts=o||{},t.parse(),t.initExtendMethods()};CommandLine.prototype.parse=function(){var o=this,t=utils.clone(process.argv);t=t.splice(2),o.options=[],o.args=[];var n=new RegExp("^-");t.forEach(function(t){n.test(t)?o.options.push(t.replace(":","=")):o.args.push(t)}),o.opts.commandEnabled&&(o.command=o.args[0]||"",o.args=o.args.splice(1))},CommandLine.prototype.initExtendMethods=function(){var o=this;o.options.has=function(t){for(var n=0;n<o.options.length;n++){var s=o.options[n];if(s==t||s.split("=")[0]==t)return!0}return!1},o.options.getValue=function(t){for(var n=0;n<o.options.length;n++){var s=o.options[n];if(s==t||s.split("=")[0]==t)return s.split("=")[1]}return null},o.options.setValue=function(t,n){if(o.options.has(t)){var s=o.options;o.options.splice(0,o.options.length);for(var i=0;i<s.length;i++){var e=s[i];e!=t&&e.split("=")[0]!=t&&o.options.push(e)}}o.options.push(t+"="+n)},o.options.getNodeOptions=function(){for(var t=[],n=new RegExp("^--"),s=0;s<o.options.length;s++){var i=o.options[s];n.test(i)&&t.push(i)}return t}};