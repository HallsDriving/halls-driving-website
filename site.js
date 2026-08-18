document.addEventListener('DOMContentLoaded', function () {

  // Optional desktop view from a phone. The button is present in every page footer.
  (function setupViewModeToggle(){
    var meta = document.querySelector('meta[name="viewport"]');
    var button = document.getElementById('view-mode-toggle');
    if (!meta || !button) return;
    var forcedDesktop = localStorage.getItem('hallsViewMode') === 'desktop';
    function applyMode(){
      forcedDesktop = localStorage.getItem('hallsViewMode') === 'desktop';
      meta.setAttribute('content', forcedDesktop ? 'width=1180' : 'width=device-width,initial-scale=1');
      button.textContent = forcedDesktop ? 'Return to Mobile View' : 'View Desktop Site';
      button.classList.toggle('is-desktop-mode', forcedDesktop);
    }
    applyMode();
    button.addEventListener('click', function(){
      if (localStorage.getItem('hallsViewMode') === 'desktop') localStorage.removeItem('hallsViewMode');
      else localStorage.setItem('hallsViewMode','desktop');
      window.location.reload();
    });
  })();

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char];
    });
  }

  function buildCalendar(dates) {
    var target = document.getElementById('calendar-months');
    if (!target || !Array.isArray(dates)) return;
    var grouped = {};
    dates.forEach(function (item) {
      if (!item.date) return;
      var parts = item.date.split('-').map(Number);
      if (parts.length !== 3) return;
      var key = parts[0] + '-' + String(parts[1]).padStart(2, '0');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({day: parts[2], session: item.session || '', status: item.status || 'Available'});
    });
    var keys = Object.keys(grouped).sort();
    if (!keys.length) {
      target.innerHTML = '<div class="calendar-empty-message">Please contact Hall\'s Driving for the newest available class dates.</div>';
      return;
    }
    var today = new Date();
    var html = '';
    keys.forEach(function (key) {
      var year = Number(key.slice(0,4));
      var month = Number(key.slice(5,7));
      if (today >= new Date(year, month, 1)) return;
      var entries = {};
      grouped[key].forEach(function (item) { entries[item.day] = item; });
      var monthName = new Date(year, month - 1, 1).toLocaleString('en-US', {month:'long'}).toUpperCase();
      var first = new Date(year, month - 1, 1).getDay();
      var count = new Date(year, month, 0).getDate();
      html += '<div class="month-panel" data-year="'+year+'" data-month="'+month+'"><div class="panel-head">'+monthName+' '+year+'</div><div class="calendar">';
      ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function (d) { html += '<div class="day">'+d+'</div>'; });
      for (var i=0;i<first;i++) html += '<div class="empty"></div>';
      for (var day=1;day<=count;day++) {
        var item=entries[day];
        if (item) html += '<div class="available">'+day+'<br><small>'+escapeHtml(item.session)+'<br>'+escapeHtml(item.status)+'</small></div>';
        else html += '<div>'+day+'</div>';
      }
      html += '</div></div>';
    });
    target.innerHTML = html || '<div class="calendar-empty-message">Please contact Hall\'s Driving for the newest available class dates.</div>';
  }

  fetch('content/site.json', {cache:'no-store'})
    .then(function (response) { if (!response.ok) throw new Error('Content unavailable'); return response.json(); })
    .then(function (data) {
      var announcement = document.getElementById('site-announcement');
      if (announcement && data.home && data.home.announcement) {
        announcement.querySelector('p').textContent = data.home.announcement;
        announcement.hidden = false;
      }
      var welcome = document.getElementById('home-welcome-text');
      if (welcome && data.home && data.home.welcome_text) welcome.textContent = data.home.welcome_text;
      var heroPhoto = document.getElementById('home-hero-photo');
      if (heroPhoto && data.home && data.home.hero_photo) heroPhoto.src = data.home.hero_photo;
      var aboutPhoto = document.getElementById('home-about-photo');
      if (aboutPhoto && data.home && data.home.about_photo) aboutPhoto.src = data.home.about_photo;
      var about = document.getElementById('about-first-paragraph');
      if (about && data.about && data.about.first_paragraph) about.textContent = data.about.first_paragraph;
      ['journey_paragraph_1','journey_paragraph_2','journey_paragraph_3'].forEach(function(key, index) {
        var el = document.getElementById('about-journey-' + (index + 1));
        if (el && data.about && data.about[key]) el.textContent = data.about[key];
      });
      var instructor1 = document.getElementById('instructor-photo-1');
      if (instructor1 && data.about && data.about.instructor_photo_1) instructor1.src = data.about.instructor_photo_1;
      var instructor2 = document.getElementById('instructor-photo-2');
      if (instructor2 && data.about && data.about.instructor_photo_2) instructor2.src = data.about.instructor_photo_2;
      var times = document.getElementById('class-times');
      if (times && data.classes && Array.isArray(data.classes.class_times)) {
        times.innerHTML = data.classes.class_times.map(function (item) {
          return '<div class="class-card"><h2>'+escapeHtml(item.title)+'</h2><p>'+escapeHtml(item.time)+'</p></div>';
        }).join('');
      }
      var heading = document.getElementById('schedule-heading');
      if (heading && data.classes && data.classes.schedule_heading) heading.textContent = data.classes.schedule_heading;
      var onlineNotice = document.getElementById('online-course-notice');
      if (onlineNotice && data.classes) {
        var noticeText = data.classes.online_course_notice || '';
        if (noticeText) {
          onlineNotice.querySelector('p').textContent = noticeText;
          onlineNotice.hidden = false;
        } else {
          onlineNotice.hidden = true;
        }
      }
      if (data.classes) buildCalendar(data.classes.dates || []);
      var intro = document.getElementById('student-success-intro');
      if (intro && data.student_success && data.student_success.intro) intro.textContent = data.student_success.intro;
      var gallery = document.getElementById('student-gallery');
      if (gallery && data.student_success && Array.isArray(data.student_success.photos)) {
        gallery.innerHTML = data.student_success.photos.map(function (item) {
          return '<figure><img alt="Student success photo" src="'+escapeHtml(item.image)+'"><figcaption>'+escapeHtml(item.caption || 'Hall\'s Driving Student Success')+'</figcaption></figure>';
        }).join('');
      }
    })
    .catch(function () { /* Static fallback stays visible if content cannot load. */ });

  // Calendar fallback: hide a month only after its final day has passed.
  var today = new Date();
  document.querySelectorAll('.month-panel[data-year][data-month]').forEach(function (panel) {
    var year = Number(panel.getAttribute('data-year'));
    var month = Number(panel.getAttribute('data-month'));
    if (today >= new Date(year, month, 1)) panel.hidden = true;
  });
});

/* Final functional mobile navigation. Desktop navigation is untouched. */
document.addEventListener('DOMContentLoaded', function () {
  var nav = document.getElementById('site-navigation');
  if (!nav) return;
  var navWrap = nav.closest('.nav');
  if (!navWrap) return;
  var button = navWrap.querySelector('.menu-toggle');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-toggle';
    button.setAttribute('aria-controls', 'site-navigation');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open site menu');
    button.innerHTML = '<span class="menu-label">MENU</span>';
    navWrap.insertBefore(button, nav);
  }
  function closeMenu(){
    nav.classList.remove('open');
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-label','Open site menu');
    var label=button.querySelector('.menu-label'); if(label) label.textContent='MENU';
  }
  button.addEventListener('click', function(){
    var opening=!nav.classList.contains('open');
    nav.classList.toggle('open', opening);
    button.setAttribute('aria-expanded', opening ? 'true':'false');
    button.setAttribute('aria-label', opening ? 'Close site menu':'Open site menu');
    var label=button.querySelector('.menu-label'); if(label) label.textContent=opening?'CLOSE':'MENU';
  });
  nav.querySelectorAll('a').forEach(function(link){link.addEventListener('click',closeMenu)});
  window.addEventListener('resize',function(){if(window.innerWidth>850) closeMenu()});
});
