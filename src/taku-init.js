(function(t,e,a,n){
  function c(){
    if(!e.getElementById(a)){
      var t=e.getElementsByTagName(n)[0],
      c=e.createElement(n);
      c.type="text/javascript",
      c.async=!0,
      c.src="https://cdn.taku-app.com/js/latest.js",
      t.parentNode.insertBefore(c,t)
    }
  }
  if("function"!=typeof t.Taku){
    var s=function(){s.q.push(arguments)};
    s.q=[],t.Taku=s,
    "complete"===e.readyState?c():
    t.attachEvent?t.attachEvent("onload",c):
    t.addEventListener("load",c,!1)
  }
})(window,document,"taku-js","script");

window.Taku('news:boot', {
  api_public_key: "0d7a5327e1691906d9f4a5fec5469b1b",
}); 