/**
 * cmdline.js - cmdline is a process.argv parser
 * @version v0.0.5
 * @link http://houfeng.net/cmdline
 * @license MIT
 * @author Houfeng
 * @email admin@xhou.net
 */
var utils=require("real-utils"),CommandLine=module.exports=function(t){var o=this;o.opts=t||{},o.parse(),o.initExtendMethods()};CommandLine.prototype.parse=function(){var t=this,o=utils.clone(process.argv);o=o.splice(2),t.options=[],t.args=[];var n=new RegExp("^-");o.forEach(function(o){n.test(o)?t.options.push(o.replace(":","=")):t.args.push(o)}),t.opts.commandEnabled&&(t.command=t.args[0]||"",t.args=t.args.splice(1))},CommandLine.prototype.initExtendMethods=function(){var t=this;t.options.has=function(o){return t.options.some(function(t){return t==o||t.split("=")[0]==o?!0:void 0})},t.options.getValue=function(o){for(var n=0;n<t.options.length;n++){var s=t.options[n];if(s==o||s.split("=")[0]==o)return s.split("=")[1]}return null},t.options.setValue=function(o,n){if(t.options.has(o)){var s=utils.clone(t.options);t.options.splice(0,t.options.length);for(var i=0;i<s.length;i++){var e=s[i];e!=o&&e.split("=")[0]!=o&&t.options.push(e)}}t.options.push(o+"="+n)},t.options.getNodeOptions=function(){var o=new RegExp("^--");return t.options.filter(function(t){return o.test(t)})}};