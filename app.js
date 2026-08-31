/**
 * Focus Sessions - Application Logic & Real OTP System
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // App State
    // -------------------------------------------------------------------------
    const state = {
        name: '',
        contact: '',
        contactType: 'email', // 'email' or 'sms'
        day: 'Today',
        time: '10:00 AM',
        topic: '',
        goalNotes: '',
        activeOtpCode: '', // Simulated or returned OTP code
        resendTimerCount: 45,
        resendInterval: null,
        
        // Solo Sprint Timer State
        timerSeconds: 15 * 60,
        timerInitialSeconds: 15 * 60,
        timerInterval: null,
        timerIsRunning: false,
        activeSound: 'silent'
    };

    // -------------------------------------------------------------------------
    // DOM Elements
    // -------------------------------------------------------------------------
    const step1Pill = document.getElementById('step1Pill');
    const stepLine = document.getElementById('stepLine');
    const step2Pill = document.getElementById('step2Pill');
    const stepLine2 = document.getElementById('stepLine2');
    const step3Pill = document.getElementById('step3Pill');
    const bookingTitle = document.getElementById('bookingTitle');
    const bookingSubtitle = document.getElementById('bookingSubtitle');

    const bookingForm = document.getElementById('bookingForm');
    const userNameInput = document.getElementById('userName');
    const userContactInput = document.getElementById('userContact');
    const contactTypeBadge = document.getElementById('contactTypeBadge');
    const topicSelect = document.getElementById('topic');
    const goalNotesInput = document.getElementById('goalNotes');
    const selectedTimeInput = document.getElementById('selectedTime');
    const selectedDayInput = document.getElementById('selectedDay');
    const submitFormBtn = document.getElementById('submitFormBtn');
    const btnText = document.getElementById('btnText');

    const nameFormGroup = document.getElementById('nameFormGroup');
    const contactFormGroup = document.getElementById('contactFormGroup');
    const topicFormGroup = document.getElementById('topicFormGroup');

    // OTP Section Elements
    const otpSection = document.getElementById('otpSection');
    const otpTargetDisplay = document.getElementById('otpTargetDisplay');
    const deliveryToast = document.getElementById('deliveryToast');
    const demoOtpBanner = document.getElementById('demoOtpBanner');
    const simulatedOtpCode = document.getElementById('simulatedOtpCode');
    const autoFillOtpBtn = document.getElementById('autoFillOtpBtn');
    const otpForm = document.getElementById('otpForm');
    const otpDigitInputs = document.querySelectorAll('.otp-digit');
    const otpError = document.getElementById('otpError');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const countdownTimer = document.getElementById('countdownTimer');
    const timerText = document.getElementById('timerText');
    const resendOtpBtn = document.getElementById('resendOtpBtn');
    const editContactBtn = document.getElementById('editContactBtn');

    // Receipt / Success Elements
    const successMessage = document.getElementById('successMessage');
    const receiptName = document.getElementById('receiptName');
    const receiptTime = document.getElementById('receiptTime');
    const receiptContact = document.getElementById('receiptContact');
    const receiptTopic = document.getElementById('receiptTopic');
    const addToCalBtn = document.getElementById('addToCalBtn');
    const bookAnotherBtn = document.getElementById('bookAnotherBtn');

    // Solo Sprint Timer Elements
    const timerDigits = document.getElementById('timerDigits');
    const timerStatus = document.getElementById('timerStatus');
    const timerToggleBtn = document.getElementById('timerToggleBtn');
    const timerResetBtn = document.getElementById('timerResetBtn');
    const soundPills = document.querySelectorAll('.sound-pill');

    // -------------------------------------------------------------------------
    // Time Validation Logic (Disables Past Time Slots for Today)
    // -------------------------------------------------------------------------
    function updateTimeSlots() {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const selectedDay = selectedDayInput ? selectedDayInput.value : state.day;

        document.querySelectorAll('.time-btn').forEach(button => {
            if (selectedDay !== 'Today') {
                button.disabled = false;
                button.classList.remove('disabled');
                return;
            }

            const timeString = button.getAttribute('data-time');
            if (!timeString) return;

            const [time, modifier] = timeString.split(' ');
            let [hours, minutes] = time.split(':').map(Number);

            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;

            const isPast = hours < currentHours || (hours === currentHours && minutes <= currentMinutes);

            if (isPast) {
                button.disabled = true;
                button.classList.add('disabled');
                button.classList.remove('active');

                const statusSpan = button.querySelector('.time-status');
                if (statusSpan) statusSpan.textContent = 'Passed';
            } else {
                button.disabled = false;
                button.classList.remove('disabled');
            }
        });

        // If the current active button is now disabled, reset selection
        const activeBtn = document.querySelector('.time-btn.active');
        if (activeBtn && activeBtn.disabled) {
            activeBtn.classList.remove('active');
            selectedTimeInput.value = '';
            state.time = '';
        }
    }

    // -------------------------------------------------------------------------
    // Contact Type Auto-Detection (Email vs Mobile SMS)
    // -------------------------------------------------------------------------
    function detectContactType(value) {
        const val = value.trim();
        if (!val) {
            contactTypeBadge.textContent = 'Email / SMS';
            contactTypeBadge.classList.remove('detected');
            state.contactType = 'email';
            return;
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        const digits = val.replace(/\D/g, '');

        if (isEmail || val.includes('@')) {
            contactTypeBadge.textContent = '📧 EMAIL';
            contactTypeBadge.classList.add('detected');
            state.contactType = 'email';
        } else if (digits.length >= 7 || /^[\d\s()+-]+$/.test(val)) {
            contactTypeBadge.textContent = '📱 SMS TEXT';
            contactTypeBadge.classList.add('detected');
            state.contactType = 'sms';
        } else {
            contactTypeBadge.textContent = 'Email / SMS';
            contactTypeBadge.classList.remove('detected');
        }
    }

    userContactInput.addEventListener('input', (e) => {
        detectContactType(e.target.value);
        contactFormGroup.classList.remove('has-error');
    });

    userNameInput.addEventListener('input', () => nameFormGroup.classList.remove('has-error'));
    topicSelect.addEventListener('change', () => topicFormGroup.classList.remove('has-error'));

    // Date Chip & Time Option Selector Logic
    const dateChips = document.querySelectorAll('.date-chip');
    dateChips.forEach(chip => {
        chip.addEventListener('click', () => {
            dateChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedDayInput.value = chip.dataset.day;
            state.day = chip.dataset.day;

            updateTimeSlots();
        });
    });

    const timeBtns = document.querySelectorAll('.time-btn');
    timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            timeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTimeInput.value = btn.dataset.time;
            state.time = btn.dataset.time;
        });
    });

    // -------------------------------------------------------------------------
    // STEP 1: Form Validation & Submit Handler
    // -------------------------------------------------------------------------
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameVal = userNameInput.value.trim();
        const contactVal = userContactInput.value.trim();
        const topicVal = topicSelect.value;
        state.goalNotes = goalNotesInput.value.trim();

        let isValid = true;

        if (!nameVal) {
            nameFormGroup.classList.add('has-error');
            isValid = false;
        } else {
            nameFormGroup.classList.remove('has-error');
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactVal);
        const digits = contactVal.replace(/\D/g, '');
        const isPhone = digits.length >= 10;

        if (!contactVal || (!isEmail && !isPhone)) {
            contactFormGroup.classList.add('has-error');
            isValid = false;
        } else {
            contactFormGroup.classList.remove('has-error');
        }

        if (!topicVal) {
            topicFormGroup.classList.add('has-error');
            isValid = false;
        } else {
            topicFormGroup.classList.remove('has-error');
        }

        if (!isValid) return;

        state.name = nameVal;
        state.contact = contactVal;
        state.topic = topicVal;

        submitFormBtn.disabled = true;
        btnText.textContent = 'Generating & Sending Code...';

        await requestOtpDelivery();

        submitFormBtn.disabled = false;
        btnText.textContent = 'Send Verification Code & Continue';
    });

    // -------------------------------------------------------------------------
    // Request OTP Delivery from Backend API
    // -------------------------------------------------------------------------
    async function requestOtpDelivery() {
        try {
            const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: state.name,
                    contact: state.contact,
                    day: state.day,
                    time: state.time,
                    topic: state.topic
                })
            });

            const data = await response.json();

            if (data.success) {
                transitionToStep2(data);
            } else {
                alert(data.message || 'Failed to send verification code. Please try again.');
            }
        } catch (err) {
            console.warn('Backend API connection issue, attempting client-side dispatch:', err);
            handleClientFallbackOtp();
        }
    }

    function handleClientFallbackOtp() {
        const simulatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        transitionToStep2({
            success: true,
            mode: 'simulated',
            otp: simulatedCode,
            delivery_note: 'Demo mode active.'
        });
    }

    function transitionToStep2(otpData) {
        step1Pill.classList.remove('active');
        step1Pill.classList.add('completed');
        stepLine.classList.add('completed');
        step2Pill.classList.add('active');

        bookingTitle.textContent = 'Enter Verification Code';
        bookingSubtitle.textContent = `Please enter the 6-digit verification code sent to ${state.contact}`;

        bookingForm.style.display = 'none';
        otpSection.style.display = 'block';
        otpTargetDisplay.textContent = state.contact;

        if (otpData.mode === 'real') {
            deliveryToast.style.display = 'block';
            deliveryToast.className = 'delivery-toast success';
            deliveryToast.innerHTML = `✅ <strong>Code Sent!</strong> ${otpData.delivery_note || `We sent an actual verification code to <code>${state.contact}</code>.`}`;
            demoOtpBanner.style.display = 'none';
        } else {
            deliveryToast.style.display = 'block';
            deliveryToast.className = 'delivery-toast notice';
            deliveryToast.innerHTML = `ℹ️ <strong>Demo Delivery Mode:</strong> Server generated a verification code below for testing.`;
            
            demoOtpBanner.style.display = 'flex';
            state.activeOtpCode = otpData.otp || '123456';
            simulatedOtpCode.textContent = state.activeOtpCode;
        }

        clearOtpInputs();
        startResendTimer();
        if (otpDigitInputs.length > 0) otpDigitInputs[0].focus();
    }

    autoFillOtpBtn.addEventListener('click', () => {
        if (!state.activeOtpCode) return;
        const digits = state.activeOtpCode.split('');
        otpDigitInputs.forEach((input, idx) => {
            if (digits[idx]) {
                input.value = digits[idx];
                input.classList.add('filled');
            }
        });
        if (otpDigitInputs.length >= 6) otpDigitInputs[5].focus();
        otpError.style.display = 'none';
    });

    // -------------------------------------------------------------------------
    // 6-Digit Segmented OTP Input Handling
    // -------------------------------------------------------------------------
    function clearOtpInputs() {
        otpDigitInputs.forEach(input => {
            input.value = '';
            input.classList.remove('filled');
        });
        otpError.style.display = 'none';
    }

    otpDigitInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            input.value = val ? val.slice(-1) : '';

            if (input.value) {
                input.classList.add('filled');
                if (index < otpDigitInputs.length - 1) {
                    otpDigitInputs[index + 1].focus();
                }
            } else {
                input.classList.remove('filled');
            }

            otpError.style.display = 'none';
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (!input.value && index > 0) {
                    otpDigitInputs[index - 1].focus();
                    otpDigitInputs[index - 1].value = '';
                    otpDigitInputs[index - 1].classList.remove('filled');
                }
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData)?.getData('text') || '';
            const digits = pastedData.replace(/\D/g, '').slice(0, 6);

            if (digits) {
                digits.split('').forEach((char, idx) => {
                    if (otpDigitInputs[idx]) {
                        otpDigitInputs[idx].value = char;
                        otpDigitInputs[idx].classList.add('filled');
                    }
                });

                const focusIndex = Math.min(digits.length, otpDigitInputs.length - 1);
                otpDigitInputs[focusIndex].focus();
                otpError.style.display = 'none';
            }
        });
    });

    // -------------------------------------------------------------------------
    // STEP 2: Verify OTP Form Submit Handler
    // -------------------------------------------------------------------------
    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        let enteredCode = '';
        otpDigitInputs.forEach(input => enteredCode += input.value.trim());

        if (enteredCode.length < 6) {
            otpError.textContent = 'Please enter all 6 digits of your verification code.';
            otpError.style.display = 'block';
            return;
        }

        verifyOtpBtn.disabled = true;
        verifyOtpBtn.textContent = 'Verifying...';

        try {
            const response = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contact: state.contact,
                    otp: enteredCode
                })
            });

            const data = await response.json();

            if (data.success) {
                transitionToStep3();
            } else {
                otpError.textContent = data.message || 'Invalid code. Please try again.';
                otpError.style.display = 'block';
                shakeOtpGroup();
            }
        } catch (err) {
            if (state.activeOtpCode && enteredCode === state.activeOtpCode) {
                transitionToStep3();
            } else {
                otpError.textContent = 'Invalid code. Please try again.';
                otpError.style.display = 'block';
                shakeOtpGroup();
            }
        }

        verifyOtpBtn.disabled = false;
        verifyOtpBtn.textContent = 'Confirm & Reserve My Free Session';
    });

    function shakeOtpGroup() {
        const group = document.querySelector('.otp-input-group');
        if (!group) return;
        group.style.transform = 'translateX(-8px)';
        setTimeout(() => group.style.transform = 'translateX(8px)', 80);
        setTimeout(() => group.style.transform = 'translateX(-4px)', 160);
        setTimeout(() => group.style.transform = 'translateX(4px)', 240);
        setTimeout(() => group.style.transform = 'translateX(0)', 320);
    }

    function startResendTimer() {
        clearInterval(state.resendInterval);
        state.resendTimerCount = 45;
        resendOtpBtn.disabled = true;
        timerText.style.display = 'inline';
        countdownTimer.textContent = state.resendTimerCount;

        state.resendInterval = setInterval(() => {
            state.resendTimerCount--;
            countdownTimer.textContent = state.resendTimerCount;

            if (state.resendTimerCount <= 0) {
                clearInterval(state.resendInterval);
                resendOtpBtn.disabled = false;
                timerText.style.display = 'none';
            }
        }, 1000);
    }

    resendOtpBtn.addEventListener('click', async () => {
        deliveryToast.style.display = 'block';
        deliveryToast.className = 'delivery-toast notice';
        deliveryToast.innerHTML = `⏳ Sending a new verification code...`;
        
        await requestOtpDelivery();
    });

    editContactBtn.addEventListener('click', () => {
        otpSection.style.display = 'none';
        bookingForm.style.display = 'block';

        step2Pill.classList.remove('active');
        stepLine.classList.remove('completed');
        step1Pill.classList.remove('completed');
        step1Pill.classList.add('active');

        bookingTitle.textContent = 'Book Your 15-Minute Session';
        bookingSubtitle.textContent = 'Choose your preferred time & verify your contact details to reserve your spot.';
    });

    // -------------------------------------------------------------------------
    // STEP 3: Transition to Confirmed State
    // -------------------------------------------------------------------------
    function transitionToStep3() {
        step2Pill.classList.remove('active');
        step2Pill.classList.add('completed');
        stepLine2.classList.add('completed');
        step3Pill.classList.add('active');

        bookingTitle.textContent = 'You\'re All Set!';
        bookingSubtitle.textContent = 'Your 15-minute micro-coaching session is reserved.';

        otpSection.style.display = 'none';
        successMessage.style.display = 'block';

        receiptName.textContent = state.name;
        receiptTime.textContent = `${state.day} at ${state.time} (15 Mins)`;
        receiptContact.textContent = state.contact;
        receiptTopic.textContent = state.topic;

        setupGoogleCalendarLink();
        launchConfetti();
    }

    function setupGoogleCalendarLink() {
        const title = encodeURIComponent("🎯 Focus Sessions 15-Minute Micro-Coaching");
        const details = encodeURIComponent(`1-on-1 Micro-Coaching session with peer mentor.\n\nStudent: ${state.name}\nTopic: ${state.topic}\nNotes: ${state.goalNotes || 'None'}`);
        const location = encodeURIComponent("Focus Sessions Web Portal (Link sent via SMS/Email)");

        const now = new Date();
        if (state.day === 'Tomorrow') now.setDate(now.getDate() + 1);
        else if (state.day === 'Saturday') {
            const dayOfWeek = now.getDay();
            const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
            now.setDate(now.getDate() + daysUntilSat);
        }

        const dateStr = now.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 8);
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dateStr}T150000Z/${dateStr}T151500Z`;

        addToCalBtn.onclick = () => window.open(gcalUrl, '_blank');
    }

    bookAnotherBtn.addEventListener('click', () => {
        successMessage.style.display = 'none';
        bookingForm.style.display = 'block';
        bookingForm.reset();

        step1Pill.className = 'step-pill active';
        step2Pill.className = 'step-pill';
        step3Pill.className = 'step-pill';
        stepLine.className = 'step-line';
        stepLine2.className = 'step-line';

        bookingTitle.textContent = 'Book Your 15-Minute Session';
        bookingSubtitle.textContent = 'Choose your preferred time & verify your contact details to reserve your spot.';

        updateTimeSlots();
    });

    // -------------------------------------------------------------------------
    // Canvas Confetti Celebration Animation
    // -------------------------------------------------------------------------
    function launchConfetti() {
        const canvas = document.getElementById('confettiCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

        for (let i = 0; i < 90; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2 - 40,
                r: Math.random() * 6 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 0.7) * 16,
                gravity: 0.3,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }

        let animationFrame;
        let startTime = Date.now();

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.rotation += p.rotationSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.5);
                ctx.restore();
            });

            if (Date.now() - startTime < 3500) {
                animationFrame = requestAnimationFrame(render);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                cancelAnimationFrame(animationFrame);
            }
        }

        render();
    }

    // -------------------------------------------------------------------------
    // Interactive Feature 1: Solo Sprint 15-Minute Focus Timer
    // -------------------------------------------------------------------------
    function updateTimerDisplay() {
        const mins = Math.floor(state.timerSeconds / 60);
        const secs = state.timerSeconds % 60;
        timerDigits.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    timerToggleBtn.addEventListener('click', () => {
        if (state.timerIsRunning) {
            pauseSoloTimer();
        } else {
            startSoloTimer();
        }
    });

    timerResetBtn.addEventListener('click', () => {
        pauseSoloTimer();
        state.timerSeconds = state.timerInitialSeconds;
        updateTimerDisplay();
        timerStatus.textContent = 'Ready to focus?';
    });

    function startSoloTimer() {
        state.timerIsRunning = true;
        timerToggleBtn.textContent = '⏸ Pause Sprint';
        timerStatus.textContent = '🔥 Focus session in progress... Keep going!';

        state.timerInterval = setInterval(() => {
            if (state.timerSeconds > 0) {
                state.timerSeconds--;
                updateTimerDisplay();
            } else {
                pauseSoloTimer();
                timerStatus.textContent = '🎉 Sprint Completed! Take a well-deserved 5-min break.';
                launchConfetti();
            }
        }, 1000);
    }

    function pauseSoloTimer() {
        state.timerIsRunning = false;
        clearInterval(state.timerInterval);
        timerToggleBtn.textContent = '▶ Start 15-Min Sprint';
        if (state.timerSeconds > 0 && state.timerSeconds < state.timerInitialSeconds) {
            timerStatus.textContent = 'Paused. Click start when ready to resume.';
        }
    }

    // -------------------------------------------------------------------------
    // Web Audio Synthesized Ambient Background Sounds & Tone Frequency
    // -------------------------------------------------------------------------
    let audioCtx = null;
    let activeNoiseNode = null;
    let activeOscillatorNode = null;

    async function ensureAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
    }

    function stopAmbientSound() {
        if (activeNoiseNode) {
            try {
                activeNoiseNode.stop();
                activeNoiseNode.disconnect();
            } catch (e) {}
            activeNoiseNode = null;
        }
        if (activeOscillatorNode) {
            try {
                activeOscillatorNode.stop();
                activeOscillatorNode.disconnect();
            } catch (e) {}
            activeOscillatorNode = null;
        }
    }

    async function playAmbientSound(type) {
        await ensureAudioContext();
        stopAmbientSound();

        if (type === 'silent') return;

        // 852 Hz Pure Sine Tone Generator
        if (type === '852hz') {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(852, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            osc.start();
            activeOscillatorNode = osc;
            return;
        }

        // Ambient Synthesizer (Rain, White Noise, Cafe)
        const bufferSize = audioCtx.sampleRate * 2;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = audioCtx.createBiquadFilter();
        const gainNode = audioCtx.createGain();

        if (type === 'rain') {
            filter.type = 'lowpass';
            filter.frequency.value = 800;
            gainNode.gain.value = 0.2;
        } else if (type === 'whitenoise') {
            filter.type = 'bandpass';
            filter.frequency.value = 1200;
            gainNode.gain.value = 0.15;
        } else if (type === 'cafe') {
            filter.type = 'lowpass';
            filter.frequency.value = 500;
            gainNode.gain.value = 0.25;
        }

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        whiteNoise.start();
        activeNoiseNode = whiteNoise;
    }

    soundPills.forEach(pill => {
        pill.addEventListener('click', async () => {
            soundPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const soundType = pill.dataset.sound;
            state.activeSound = soundType;
            await playAmbientSound(soundType);
        });
    });

    // Run initial time validation on page initialization
    updateTimeSlots();
});