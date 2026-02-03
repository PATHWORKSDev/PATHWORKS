const root = document.body?.dataset?.root || "";
const footerRoot = document.getElementById("footer-root") || (() => {
  const el = document.createElement("div");
  el.id = "footer-root";
  document.body.appendChild(el);
  return el;
})();

footerRoot.innerHTML = `
<footer class="footer">
  <div class="container footerInner">
    <div>
      <div class="footerSmall" style="margin-top:10px">
        © <span id="year"></span> PATHWORKS
      </div>
    </div>

    <div>
      <div class="footerLinks">
        <a href="https://discord.gg/vKN6ArbrEk" target="_blank" rel="noreferrer" aria-label="Discord">
          <img class="footerSocialIcon" src="${root}assets/img/icons/discord.png" alt="Discord">
        </a>
      </div>
    </div>
  </div>
</footer>
`;

const year = footerRoot.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());
