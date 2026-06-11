/* amirsportdiet.com — shared site behavior */

const LEAD_ENDPOINT = 'https://us-central1-wellnessprojectar.cloudfunctions.net/submitLead';
const WA_PHONE = '972524844497';

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

/* Count-up stats ([data-count]) — animate once when scrolled into view */
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

/* Body-composition bars ([data-w]) — fill when visible */
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
                    phone: data.phone,
                    notes: (data.message || '') + (interest ? `\n[מתעניין/ת ב: ${interest}]` : ''),
                    source: interest ? `אתר — ${interest}` : 'אתר',
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
