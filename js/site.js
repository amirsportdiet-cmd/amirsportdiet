/* amirsportdiet.com - shared site behavior */

const LEAD_ENDPOINT = 'https://us-central1-wellnessprojectar.cloudfunctions.net/submitLead';
const WA_PHONE = '972524844497';
const IN_BLOG = location.pathname.includes('/blog/');

/* Skip link (accessibility): first focusable element jumps past the nav */
const mainTarget = document.querySelector('.page-hero, .hero-home, .hero-dark, article, section');
if (mainTarget) {
    if (!mainTarget.id) mainTarget.id = 'main-content';
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = `#${mainTarget.id}`;
    skip.textContent = 'דילוג לתוכן הראשי';
    document.body.prepend(skip);
}

/* Mobile sticky CTA bar (not on the contact page itself or 404) */
if (!/contact\.html|404/.test(location.pathname)) {
    const bar = document.createElement('div');
    bar.className = 'mobile-cta';
    bar.innerHTML = `
        <a class="btn btn-wa" data-wa="היי אמיר, אשמח לשמוע פרטים">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.2 1.1-1.7 1.2-.4 0-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.7-.9c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.3 1.3z"/></svg>
            וואטסאפ
        </a>
        <a class="btn btn-primary" href="${IN_BLOG ? '../' : ''}contact.html">השארת פרטים</a>`;
    document.body.appendChild(bar);
    document.body.classList.add('has-ctabar');
}

/* WhatsApp links: every element with data-wa gets a prefilled chat link */
document.querySelectorAll('[data-wa]').forEach((el) => {
    const msg = el.getAttribute('data-wa') || 'היי אמיר, אשמח לשמוע פרטים';
    el.href = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
});

/* Navbar scroll state */
const navbar = document.querySelector('.navbar');
const onScroll = () => navbar && navbar.classList.toggle('scrolled', window.scrollY > 30);
window.addEventListener('scroll', onScroll);
onScroll();

/* Mobile menu */
const toggle = document.querySelector('.mobile-toggle');
const navLinks = document.querySelector('.nav-links');
if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('open');
        navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach((a) =>
        a.addEventListener('click', () => {
            toggle.classList.remove('open');
            navLinks.classList.remove('open');
        })
    );
}

/* Reveal on scroll */
const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
    { threshold: 0.12 }
);
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

/* Count-up stats ([data-count]) - animate once when scrolled into view */
const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (!e.isIntersecting) return;
        countObserver.unobserve(e.target);
        const target = parseInt(e.target.getAttribute('data-count'), 10) || 0;
        const dur = 1400;
        const t0 = performance.now();
        const tick = (t) => {
            const p = Math.min((t - t0) / dur, 1);
            e.target.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach((el) => countObserver.observe(el));

/* Body-composition bars ([data-w]) - fill when visible */
const barObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (!e.isIntersecting) return;
        barObserver.unobserve(e.target);
        e.target.style.width = e.target.getAttribute('data-w');
    });
}, { threshold: 0.4 });
document.querySelectorAll('[data-w]').forEach((el) => barObserver.observe(el));

/* Footer year */
const yearEl = document.querySelector('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* Lead form → dashboard (Cloud Function writes to dashboard_leads) */
const leadForm = document.querySelector('#lead-form');
if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const status = leadForm.querySelector('.form-status');
        const btn = leadForm.querySelector('button[type="submit"]');
        const data = Object.fromEntries(new FormData(leadForm).entries());

        if (!data.name || !data.phone) {
            status.textContent = 'נא למלא שם וטלפון';
            status.className = 'form-status err';
            return;
        }

        /* Israeli phone validation (mobile 05X / landline 0X / 07X, +972 accepted) */
        let phone = String(data.phone).replace(/[\s\-().]/g, '').replace(/^\+?972/, '0');
        if (!/^0(5\d{8}|7\d{8}|[23489]\d{7})$/.test(phone)) {
            status.textContent = 'מספר הטלפון לא נראה תקין - נא לבדוק אותו';
            status.className = 'form-status err';
            return;
        }

        btn.disabled = true;
        const btnText = btn.textContent;
        btn.textContent = 'שולח...';
        status.className = 'form-status';

        try {
            const interest = data.interest || '';
            const res = await fetch(LEAD_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    phone: phone,
                    notes: (data.message || '')
                        + (interest ? `\n[מתעניין/ת ב: ${interest}]` : '')
                        + `\n[נשלח מהעמוד: ${location.pathname}]`,
                    source: interest ? `אתר - ${interest}` : 'אתר',
                    website: data.website || '', // honeypot
                }),
            });
            if (!res.ok) throw new Error('bad status');
            leadForm.reset();
            status.textContent = '✓ הפרטים התקבלו! אחזור אליך בהקדם';
            status.className = 'form-status ok';
        } catch (err) {
            status.textContent = 'משהו השתבש... אפשר פשוט לשלוח לי וואטסאפ 🙂';
            status.className = 'form-status err';
        } finally {
            btn.disabled = false;
            btn.textContent = btnText;
        }
    });
}
