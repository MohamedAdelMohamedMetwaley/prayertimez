class PrayerTimes {
    constructor() {
        this.city = 'Alexandria';
        this.country = 'EG';
        this.method = 5; // Egyptian General Authority of Survey
        this.times = {};
        this.nextPrayer = '';

        this.initializeElements();
        this.initializeEventListeners();
        this.initializePWA();
        this.start();
    }

    initializeElements() {
        this.elements = {
            city: document.getElementById('city'),
            hijriDate: document.getElementById('hijriDate'),
            gregorianDate: document.getElementById('gregorianDate'),
            nextPrayerName: document.getElementById('next-prayer-name'),
            countdown: document.getElementById('countdown'),
            modal: document.getElementById('locationModal'),
            citySearch: document.getElementById('citySearch'),
            searchBtn: document.getElementById('searchBtn'),
            closeModal: document.getElementById('closeModal'),
            changeLocation: document.getElementById('changeLocation'),
            pwaInstall: document.getElementById('pwa-install'),
            acceptPwa: document.getElementById('accept-pwa'),
            denyPwa: document.getElementById('deny-pwa')
        };
    }

    initializePWA() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            // Check if we should show the prompt
            const lastDeclined = localStorage.getItem('pwaDeclined');
            const now = Date.now();

            if (!lastDeclined || (now - parseInt(lastDeclined)) > (7 * 24 * 60 * 60 * 1000)) { // 7 days
                this.elements.pwaInstall.classList.remove('hidden');
            }
        });

        this.elements.acceptPwa.addEventListener('click', async () => {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.elements.pwaInstall.classList.add('hidden');
                    localStorage.removeItem('pwaDeclined'); // Clear declined state if installed
                }
                this.deferredPrompt = null;
            }
        });

        this.elements.denyPwa.addEventListener('click', () => {
            this.elements.pwaInstall.classList.add('hidden');
            localStorage.setItem('pwaDeclined', Date.now().toString());
        });
    }

    initializeEventListeners() {
        this.elements.changeLocation.addEventListener('click', () => this.showModal());
        this.elements.closeModal.addEventListener('click', () => this.hideModal());
        this.elements.searchBtn.addEventListener('click', () => this.handleCitySearch());
    }

    async start() {
        await this.fetchPrayerTimes();
        this.updateUI();
        this.startCountdown();

        // Update times every day at midnight
        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                this.fetchPrayerTimes();
            }
        }, 60000); // Check every minute
    }

    async fetchPrayerTimes() {
        try {
            const date = new Date();
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const formattedDate = `${day}-${month}-${year}`;

            const response = await fetch(
                `https://api.aladhan.com/v1/timingsByCity/${formattedDate}?city=${this.city}&country=${this.country}&method=${this.method}`
            );

            const data = await response.json();
            this.times = data.data.timings;
            this.updateDates(data.data.date);
        } catch (error) {
            console.error('Error fetching prayer times:', error);
        }
    }

    updateDates(dateData) {
        this.elements.hijriDate.textContent = `${dateData.hijri.day} ${dateData.hijri.month.ar} ${dateData.hijri.year}`;
        this.elements.gregorianDate.textContent = new Date().toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    updateUI() {
        this.elements.city.textContent = this.city;

        const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        prayers.forEach(prayer => {
            const element = document.getElementById(`${prayer.toLowerCase()}-time`);
            if (element && this.times[prayer]) {
                const time24 = this.times[prayer];
                const [hours24, minutes] = time24.split(':');
                const hours12 = hours24 % 12 || 12;
                const ampm = hours24 < 12 ? 'AM' : 'PM';
                element.textContent = `${hours12}:${minutes} ${ampm}`;
            }
        });
    }

    startCountdown() {
        setInterval(() => {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();

            let nextPrayer = '';
            let nextPrayerTime = Infinity;

            Object.entries(this.times).forEach(([prayer, time]) => {
                if (['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(prayer)) {
                    const [hours, minutes] = time.split(':');
                    const prayerMinutes = parseInt(hours) * 60 + parseInt(minutes);

                    if (prayerMinutes > currentTime && prayerMinutes < nextPrayerTime) {
                        nextPrayer = prayer;
                        nextPrayerTime = prayerMinutes;
                    }
                }
            });

            if (nextPrayer) {
                const remainingMinutes = nextPrayerTime - currentTime;
                const hours = Math.floor(remainingMinutes / 60);
                const minutes = remainingMinutes % 60;

                this.elements.nextPrayerName.textContent = this.getPrayerNameInArabic(nextPrayer);
                this.elements.countdown.textContent = `${hours}:${minutes.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    getPrayerNameInArabic(prayer) {
        const names = {
            Fajr: 'الفجر',
            Dhuhr: 'الظهر',
            Asr: 'العصر',
            Maghrib: 'المغرب',
            Isha: 'العشاء'
        };
        return names[prayer] || prayer;
    }

    showModal() {
        this.elements.modal.classList.remove('hidden');
    }

    hideModal() {
        this.elements.modal.classList.add('hidden');
    }

    async handleCitySearch() {
        const cityName = this.elements.citySearch.value.trim();
        if (cityName) {
            this.city = cityName;
            await this.fetchPrayerTimes();
            this.updateUI();
            this.hideModal();
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new PrayerTimes();
});
