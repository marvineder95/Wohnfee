window.onscroll = function() {myFunction()};

var header = document.getElementById("header");
var sticky = header.offsetTop;
var sticky = 60;

function myFunction() {
  if (window.pageYOffset > sticky) {
    header.classList.add("sticky");
  } else {
    header.classList.remove("sticky");
  }
}