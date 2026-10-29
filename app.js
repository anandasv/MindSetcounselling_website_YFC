/**
 * MindSet - Application Logic & Real OTP System
 * Supports Vercel Serverless & Local Python Backend
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // App State
    // -------------------------------------------------------------------------
    const state = {
        role: 'A Student',
        parentName: '',
        name: '',
        contact: '',
        contactType: 'email', // 'email' or 'sms'
        day: 'Today',
        time: '10:00 AM',
        topic: '',
        goalNotes: '',
        sessionStyle: 'Chat first',
        
        // OTP State
        activeOtpCode: '', // Simulated or returned OTP code
        otpToken: '',      // Signed HMAC token for stateless verification
        resendTimerCount: 45,
        resendInterval: null,

        // Package State
        selectedPackage: {
            id: '1-session',
            name: 'One Session',
            price: '300',
            sessions: 1
        },
        
        // Solo Sprint Timer State
        timerSeconds: 15 * 60,
        timerInitialSeconds: 15 * 60,
        timerInterval: null,
        timerIsRunning: false,
        activeSound: 'silent',

        // Focus Reset Planner State
        focusMode: 'scrolling',
        microTask: ''
    };

    // -------------------------------------------------------------------------
    // DOM Elements
    // -------------------------------------------------------------------------
    const step1Pill = document.getElementById('step1Pill');
    const stepLine1 = document.getElementById('stepLine1');
    const step2Pill = document.getElementById('step2Pill');
    const stepLine2 = document.getElementById('stepLine2');
    const step3Pill = document.getElementById('step3Pill');
    const stepLine3 = document.getElementById('stepLine3');
    const step4Pill = document.getElementById('step4Pill');
    const bookingTitle = document.getElementById('bookingTitle');
    const bookingSubtitle = document.getElementById('bookingSubtitle');

    // Step 1: Booking Form Elements
    const bookingForm = document.getElementById('bookingForm');
    const userRoleSelect = document.getElementById('userRole');
    const parentNameFormGroup = document.getElementById('parentNameFormGroup');
    const parentNameInput = document.getElementById('parentName');
    const parentNameError = document.getElementById('parentNameError');
    const nameFormGroup = document.getElementById('nameFormGroup');
    const userNameLabel = document.getElementById('userNameLabel');
    const userNameInput = document.getElementById('userName');
    const nameError = document.getElementById('nameError');

    const contactFormGroup = document.getElementById('contactFormGroup');
    const userContactLabel = document.getElementById('userContactLabel');
    const userContactInput = document.getElementById('userContact');
    const contactHelperText = document.getElementById('contactHelperText');
    const contactError = document.getElementById('contactError');
    const contactTypeBadge = document.getElementById('contactTypeBadge');

    const topicSelect = document.getElementById('topic');
    const topicFormGroup = document.getElementById('topicFormGroup');
    const goalNotesInput = document.getElementById('goalNotes');
    const selectedTimeInput = document.getElementById('selectedTime');
    const selectedDayInput = document.getElementById('selectedDay');
    const submitFormBtn = document.getElementById('submitFormBtn');
    const btnText = document.getElementById('btnText');

    // Step 2: OTP Section Elements
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

    // Step 3: Package Section Elements
    const packageSection = document.getElementById('packageSection');
    const packageCards = document.querySelectorAll('.package-card');
    const confirmPackageBtn = document.getElementById('confirmPackageBtn');
    const backToOtpBtn = document.getElementById('backToOtpBtn');

    // Step 4: Success / Receipt Elements
    const successMessage = document.getElementById('successMessage');
    const receiptName = document.getElementById('receiptName');
    const receiptParentRow = document.getElementById('receiptParentRow');
    const receiptParentName = document.getElementById('receiptParentName');
    const receiptPackage = document.getElementById('receiptPackage');
    const receiptTime = document.getElementById('receiptTime');
    const receiptContact = document.getElementById('receiptContact');
    const receiptTopic = document.getElementById('receiptTopic');
    const receiptStyle = document.getElementById('receiptStyle');
    const addToCalBtn = document.getElementById('addToCalBtn');
    const bookAnotherBtn = document.getElementById('bookAnotherBtn');

    // Solo Sprint Timer Elements
    const timerDigits = document.getElementById('timerDigits');
    const timerStatus = document.getElementById('timerStatus');
    const timerToggleBtn = document.getElementById('timerToggleBtn');
    const timerResetBtn = document.getElementById('timerResetBtn');
    const soundPills = document.querySelectorAll('.sound-pill');

    // Focus Reset Planner Elements
    const resetOptions = document.querySelectorAll('.reset-option');
    const microTaskInput = document.getElementById('microTask');
    const createFocusPlanBtn = document.getElementById('createFocusPlanBtn');
    const focusPlanTitle = document.getElementById('focusPlanTitle');
    const focusPlanIntro = document.getElementById('focusPlanIntro');
    const focusPlanSteps = document.getElementById('focusPlanSteps');
    const resetMemoryNote = document.getElementById('resetMemoryNote');
    const startPlannedSprintBtn = document.getElementById('startPlannedSprintBtn');
    const usePlanForBookingBtn = document.getElementById('usePlanForBookingBtn');

    // Extended guidance feature elements
    const sessionStyleOptions = document.querySelectorAll('.session-style');
    const audienceTabs = document.querySelectorAll('.audience-tab');
    const audienceEyebrow = document.getElementById('audienceEyebrow');
    const audienceTitle = document.getElementById('audienceTitle');
    const audienceDescription = document.getElementById('audienceDescription');
    const audienceList = document.getElementById('audienceList');
    const readinessOptions = document.querySelectorAll('.readiness-option');
    const readinessResult = document.getElementById('readinessResult');
    const readinessPlanBtn = document.getElementById('readinessPlanBtn');
    const dayWins = document.querySelectorAll('.day-win');
    const winsMessage = document.getElementById('winsMessage');
    const clearWinsBtn = document.getElementById('clearWinsBtn');

    // -------------------------------------------------------------------------
    // Role Dropdown: Dynamic Field Display (Parent vs Student vs Teacher)
    // -------------------------------------------------------------------------
    function handleRoleChange() {
        const role = userRoleSelect ? userRoleSelect.value : 'A Student';
        state.role = role;

        if (role === 'A Parent' || role === 'A Guardian') {
            if (parentNameFormGroup) parentNameFormGroup.style.display = 'block';
            if (parentNameInput) parentNameInput.setAttribute('required', 'required');
            if (userNameLabel) userNameLabel.innerHTML = 'Student\'s Full Name <span class="req">*</span>';
            if (userNameInput) userNameInput.placeholder = 'e.g. Alex Johnson';
            if (userContactLabel) userContactLabel.innerHTML = 'Parent / Guardian Contact <span class="req">*</span>';
            if (userContactInput) userContactInput.placeholder = 'parent@example.com or (555) 000-0000';
            if (contactHelperText) contactHelperText.textContent = "We\'ll send the one-time verification code (OTP) to the parent\'s contact.";
        } else if (role === 'A Student') {
            if (parentNameFormGroup) {
                parentNameFormGroup.style.display = 'none';
                parentNameFormGroup.classList.remove('has-error');
            }
            if (parentNameInput) {
                parentNameInput.removeAttribute('required');
                parentNameInput.value = '';
            }
            if (userNameLabel) userNameLabel.innerHTML = 'Student\'s Full Name <span class="req">*</span>';
            if (userNameInput) userNameInput.placeholder = 'e.g. Alex Johnson';
            if (userContactLabel) userContactLabel.innerHTML = 'Student Email Address or Mobile Number <span class="req">*</span>';
            if (userContactInput) userContactInput.placeholder = 'name@example.com or (555) 000-0000';
            if (contactHelperText) contactHelperText.textContent = "We\'ll send a one-time verification code (OTP) to your address.";
        } else {
            // Teacher or Other
            if (parentNameFormGroup) {
                parentNameFormGroup.style.display = 'none';
                parentNameFormGroup.classList.remove('has-error');
            }
            if (parentNameInput) {
                parentNameInput.removeAttribute('required');
                parentNameInput.value = '';
            }
            if (userNameLabel) userNameLabel.innerHTML = 'Your Full Name <span class="req">*</span>';
            if (userNameInput) userNameInput.placeholder = 'e.g. Prof. Smith';
            if (userContactLabel) userContactLabel.innerHTML = 'Your Email Address or Mobile Number <span class="req">*</span>';
            if (userContactInput) userContactInput.placeholder = 'name@example.com or (555) 000-0000';
            if (contactHelperText) contactHelperText.textContent = "We\'ll send a one-time verification code (OTP) to this address.";
        }
    }

    if (userRoleSelect) {
        userRoleSelect.addEventListener('change', handleRoleChange);
        handleRoleChange();
    }

    // -------------------------------------------------------------------------
    // Time Validation Logic (Disables Past Time Slots ONLY for Today)
    // -------------------------------------------------------------------------
    function updateTimeSlots() {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        const selectedDay = selectedDayInput ? selectedDayInput.value : state.day;

        document.querySelectorAll('.time-btn').forEach(button => {
            const statusSpan = button.querySelector('.time-status');
            const originalStatus = button.getAttribute('data-original-status') || 'Available';

            if (selectedDay !== 'Today') {
                button.disabled = false;
                button.classList.remove('disabled');
                if (statusSpan) statusSpan.textContent = originalStatus;
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
                if (statusSpan) statusSpan.textContent = 'Passed';
            } else {
                button.disabled = false;
                button.classList.remove('disabled');
                if (statusSpan) statusSpan.textContent = originalStatus;
            }
        });

        const activeBtn = document.querySelector('.time-btn.active');
        if (activeBtn && activeBtn.disabled) {
            activeBtn.classList.remove('active');
            if (selectedTimeInput) selectedTimeInput.value = '';
            state.time = '';
        }
    }

    document.querySelectorAll('.time-btn').forEach(btn => {
        const statusSpan = btn.querySelector('.time-status');
        if (statusSpan) {
            btn.setAttribute('data-original-status', statusSpan.textContent.trim());
        }
    });

    updateTimeSlots();

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

    if (userContactInput) {
        userContactInput.addEventListener('input', (e) => {
            detectContactType(e.target.value);
            if (contactFormGroup) contactFormGroup.classList.remove('has-error');
        });
    }

    if (userNameInput) {
        userNameInput.addEventListener('input', () => {
            if (nameFormGroup) nameFormGroup.classList.remove('has-error');
        });
    }

    if (parentNameInput) {
        parentNameInput.addEventListener('input', () => {
            if (parentNameFormGroup) parentNameFormGroup.classList.remove('has-error');
        });
    }

    if (topicSelect) {
        topicSelect.addEventListener('change', () => {
            if (topicFormGroup) topicFormGroup.classList.remove('has-error');
        });
    }

    // Date Chip & Time Option Selector Logic
    const dateChips = document.querySelectorAll('.date-chip');
    dateChips.forEach(chip => {
        chip.addEventListener('click', () => {
            dateChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            const selectedDayValue = chip.dataset.day;
            if (selectedDayInput) selectedDayInput.value = selectedDayValue;
            state.day = selectedDayValue;

            updateTimeSlots();
        });
    });

    const timeBtns = document.querySelectorAll('.time-btn');
    timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            timeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (selectedTimeInput) selectedTimeInput.value = btn.dataset.time;
            state.time = btn.dataset.time;
        });
    });

    // -------------------------------------------------------------------------
    // STEP 1: Form Validation & Submit Handler
    // -------------------------------------------------------------------------
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const role = userRoleSelect ? userRoleSelect.value : 'A Student';
            const nameVal = userNameInput ? userNameInput.value.trim() : '';
            const contactVal = userContactInput ? userContactInput.value.trim() : '';
            const topicVal = topicSelect ? topicSelect.value : '';
            const parentNameVal = parentNameInput ? parentNameInput.value.trim() : '';
            if (goalNotesInput) state.goalNotes = goalNotesInput.value.trim();

            let isValid = true;

            // If parent or guardian, parent name is mandatory
            if (role === 'A Parent' || role === 'A Guardian') {
                if (!parentNameVal) {
                    if (parentNameFormGroup) parentNameFormGroup.classList.add('has-error');
                    isValid = false;
                } else {
                    if (parentNameFormGroup) parentNameFormGroup.classList.remove('has-error');
                }
            }

            // Student/Personal name is always required
            if (!nameVal) {
                if (nameFormGroup) nameFormGroup.classList.add('has-error');
                isValid = false;
            } else {
                if (nameFormGroup) nameFormGroup.classList.remove('has-error');
            }

            // Contact format check (email or 10-digit phone)
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactVal);
            const digits = contactVal.replace(/\D/g, '');
            const isPhone = digits.length >= 10;

            if (!contactVal || (!isEmail && !isPhone)) {
                if (contactFormGroup) contactFormGroup.classList.add('has-error');
                isValid = false;
            } else {
                if (contactFormGroup) contactFormGroup.classList.remove('has-error');
            }

            // Topic validation
            if (!topicVal) {
                if (topicFormGroup) topicFormGroup.classList.add('has-error');
                isValid = false;
            } else {
                if (topicFormGroup) topicFormGroup.classList.remove('has-error');
            }

            if (!isValid) return;

            state.role = role;
            state.parentName = parentNameVal;
            state.name = nameVal;
            state.contact = contactVal;
            state.topic = topicVal;
            state.sessionStyle = document.querySelector('.session-style.active')?.dataset.style || 'Chat first';

            if (submitFormBtn) submitFormBtn.disabled = true;
            if (btnText) btnText.textContent = 'Generating & Sending Code...';

            await requestOtpDelivery();

            if (submitFormBtn) submitFormBtn.disabled = false;
            if (btnText) btnText.textContent = 'Send Verification Code & Continue';
        });
    }

    // -------------------------------------------------------------------------
    // Request OTP Delivery from Backend API (/api/send-otp)
    // -------------------------------------------------------------------------
    async function requestOtpDelivery() {
        try {
            const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: state.role,
                    parentName: state.parentName,
                    name: state.name,
                    contact: state.contact,
                    day: state.day,
                    time: state.time,
                    topic: state.topic,
                    sessionStyle: state.sessionStyle
                })
            });

            const data = await response.json();

            if (data.success) {
                if (data.token) state.otpToken = data.token;
                transitionToStep2(data);
            } else {
                alert(data.message || 'Failed to send verification code. Please check details and try again.');
            }
        } catch (err) {
            console.warn('Backend API connection issue, falling back to instant client test mode:', err);
            handleClientFallbackOtp();
        }
    }

    function handleClientFallbackOtp() {
        const simulatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        state.otpToken = 'simulated_' + Date.now();
        transitionToStep2({
            success: true,
            mode: 'simulated',
            otp: simulatedCode,
            token: state.otpToken,
            delivery_note: 'Demo mode active.'
        });
    }

    function transitionToStep2(otpData) {
        if (step1Pill) step1Pill.className = 'step-pill completed';
        if (stepLine1) stepLine1.className = 'step-line completed';
        if (step2Pill) step2Pill.className = 'step-pill active';
        if (stepLine2) stepLine2.className = 'step-line';
        if (step3Pill) step3Pill.className = 'step-pill';
        if (stepLine3) stepLine3.className = 'step-line';
        if (step4Pill) step4Pill.className = 'step-pill';

        if (bookingTitle) bookingTitle.textContent = 'Verify Contact Information';
        if (bookingSubtitle) bookingSubtitle.textContent = `Please enter the 6-digit verification code sent to ${state.contact}`;

        if (bookingForm) bookingForm.style.display = 'none';
        if (packageSection) packageSection.style.display = 'none';
        if (successMessage) successMessage.style.display = 'none';
        if (otpSection) otpSection.style.display = 'block';

        if (otpTargetDisplay) otpTargetDisplay.textContent = state.contact;

        if (deliveryToast) {
            if (otpData.mode === 'real') {
                deliveryToast.style.display = 'block';
                deliveryToast.className = 'delivery-toast success';
                deliveryToast.innerHTML = `✅ <strong>Code Sent!</strong> ${otpData.delivery_note || `Verification code dispatched to <code>${state.contact}</code>.`}`;
                if (demoOtpBanner) demoOtpBanner.style.display = 'none';
            } else {
                deliveryToast.style.display = 'block';
                deliveryToast.className = 'delivery-toast notice';
                deliveryToast.innerHTML = `ℹ️ <strong>Demo Delivery Mode:</strong> Server generated a verification code below for test verification.`;
                
                if (demoOtpBanner) demoOtpBanner.style.display = 'flex';
                state.activeOtpCode = otpData.otp || '123456';
                if (simulatedOtpCode) simulatedOtpCode.textContent = state.activeOtpCode;
            }
        }

        clearOtpInputs();
        startResendTimer();
        if (otpDigitInputs.length > 0) otpDigitInputs[0].focus();
    }

    if (autoFillOtpBtn) {
        autoFillOtpBtn.addEventListener('click', () => {
            if (!state.activeOtpCode) return;
            const digits = state.activeOtpCode.split('');
            otpDigitInputs.forEach((input, idx) => {
                if (digits[idx]) {
                    input.value = digits[idx];
                    input.classList.add('filled');
                }
            });
            if (otpDigitInputs.length > 0) otpDigitInputs[otpDigitInputs.length - 1].focus();
            if (otpError) otpError.style.display = 'none';
        });
    }

    // -------------------------------------------------------------------------
    // 6-Digit Segmented OTP Input Handling
    // -------------------------------------------------------------------------
    function clearOtpInputs() {
        otpDigitInputs.forEach(input => {
            input.value = '';
            input.classList.remove('filled');
        });
        if (otpError) otpError.style.display = 'none';
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

            if (otpError) otpError.style.display = 'none';
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
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
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
                if (otpError) otpError.style.display = 'none';
            }
        });
    });

    // -------------------------------------------------------------------------
    // STEP 2: Verify OTP Form Submit Handler -> Moves to STEP 3 (Packages)
    // -------------------------------------------------------------------------
    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            let enteredCode = '';
            otpDigitInputs.forEach(input => enteredCode += input.value.trim());

            if (enteredCode.length < 6) {
                if (otpError) {
                    otpError.textContent = 'Please enter all 6 digits of your verification code.';
                    otpError.style.display = 'block';
                }
                return;
            }

            if (verifyOtpBtn) {
                verifyOtpBtn.disabled = true;
                verifyOtpBtn.textContent = 'Verifying...';
            }

            try {
                const response = await fetch('/api/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contact: state.contact,
                        otp: enteredCode,
                        token: state.otpToken
                    })
                });

                const data = await response.json();

                if (data.success) {
                    transitionToStep3();
                } else {
                    if (otpError) {
                        otpError.textContent = data.message || 'Invalid code. Please try again.';
                        otpError.style.display = 'block';
                    }
                    shakeOtpGroup();
                }
            } catch (err) {
                // Client fallback verification
                if (state.activeOtpCode && enteredCode === state.activeOtpCode) {
                    transitionToStep3();
                } else {
                    if (otpError) {
                        otpError.textContent = 'Invalid code. Please try again.';
                        otpError.style.display = 'block';
                    }
                    shakeOtpGroup();
                }
            }

            if (verifyOtpBtn) {
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.textContent = 'Verify & Choose Package →';
            }
        });
    }

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
        if (resendOtpBtn) resendOtpBtn.disabled = true;
        if (timerText) timerText.style.display = 'inline';
        if (countdownTimer) countdownTimer.textContent = state.resendTimerCount;

        state.resendInterval = setInterval(() => {
            state.resendTimerCount--;
            if (countdownTimer) countdownTimer.textContent = state.resendTimerCount;

            if (state.resendTimerCount <= 0) {
                clearInterval(state.resendInterval);
                if (resendOtpBtn) resendOtpBtn.disabled = false;
                if (timerText) timerText.style.display = 'none';
            }
        }, 1000);
    }

    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', async () => {
            if (deliveryToast) {
                deliveryToast.style.display = 'block';
                deliveryToast.className = 'delivery-toast notice';
                deliveryToast.innerHTML = `⏳ Sending a new verification code...`;
            }
            await requestOtpDelivery();
        });
    }

    if (editContactBtn) {
        editContactBtn.addEventListener('click', () => {
            if (otpSection) otpSection.style.display = 'none';
            if (packageSection) packageSection.style.display = 'none';
            if (bookingForm) bookingForm.style.display = 'block';

            if (step1Pill) step1Pill.className = 'step-pill active';
            if (stepLine1) stepLine1.className = 'step-line';
            if (step2Pill) step2Pill.className = 'step-pill';
            if (stepLine2) stepLine2.className = 'step-line';
            if (step3Pill) step3Pill.className = 'step-pill';
            if (stepLine3) stepLine3.className = 'step-line';
            if (step4Pill) step4Pill.className = 'step-pill';

            if (bookingTitle) bookingTitle.textContent = 'Book Your 15-Minute Session';
            if (bookingSubtitle) bookingSubtitle.textContent = 'Choose your preferred time & verify contact details to reserve your coaching spot.';
        });
    }

    // -------------------------------------------------------------------------
    // STEP 3: Transition to Package Selection Step
    // -------------------------------------------------------------------------
    function transitionToStep3() {
        if (step1Pill) step1Pill.className = 'step-pill completed';
        if (stepLine1) stepLine1.className = 'step-line completed';
        if (step2Pill) step2Pill.className = 'step-pill completed';
        if (stepLine2) stepLine2.className = 'step-line completed';
        if (step3Pill) step3Pill.className = 'step-pill active';
        if (stepLine3) stepLine3.className = 'step-line';
        if (step4Pill) step4Pill.className = 'step-pill';

        if (bookingTitle) bookingTitle.textContent = 'Choose Your Coaching Package';
        if (bookingSubtitle) bookingSubtitle.textContent = 'Select the option that best fits your focus goals. First 15-minute consultation included.';

        if (otpSection) otpSection.style.display = 'none';
        if (bookingForm) bookingForm.style.display = 'none';
        if (successMessage) successMessage.style.display = 'none';
        if (packageSection) packageSection.style.display = 'block';
    }

    // Package Cards Selection
    packageCards.forEach(card => {
        card.addEventListener('click', () => {
            packageCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            state.selectedPackage = {
                id: card.dataset.packageId,
                name: card.dataset.name,
                price: card.dataset.price,
                sessions: parseInt(card.dataset.sessions, 10)
            };
        });
    });

    if (backToOtpBtn) {
        backToOtpBtn.addEventListener('click', () => {
            if (packageSection) packageSection.style.display = 'none';
            if (otpSection) otpSection.style.display = 'block';

            if (step3Pill) step3Pill.className = 'step-pill';
            if (stepLine2) stepLine2.className = 'step-line';
            if (step2Pill) step2Pill.className = 'step-pill active';

            if (bookingTitle) bookingTitle.textContent = 'Verify Contact Information';
            if (bookingSubtitle) bookingSubtitle.textContent = `Please enter the 6-digit verification code sent to ${state.contact}`;
        });
    }

    if (confirmPackageBtn) {
        confirmPackageBtn.addEventListener('click', () => {
            transitionToStep4();
        });
    }

    // -------------------------------------------------------------------------
    // STEP 4: Transition to Confirmed State
    // -------------------------------------------------------------------------
    function transitionToStep4() {
        if (step1Pill) step1Pill.className = 'step-pill completed';
        if (stepLine1) stepLine1.className = 'step-line completed';
        if (step2Pill) step2Pill.className = 'step-pill completed';
        if (stepLine2) stepLine2.className = 'step-line completed';
        if (step3Pill) step3Pill.className = 'step-pill completed';
        if (stepLine3) stepLine3.className = 'step-line completed';
        if (step4Pill) step4Pill.className = 'step-pill active';

        if (bookingTitle) bookingTitle.textContent = "You\'re All Set!";
        if (bookingSubtitle) bookingSubtitle.textContent = 'Your session and package reservation is confirmed.';

        if (otpSection) otpSection.style.display = 'none';
        if (bookingForm) bookingForm.style.display = 'none';
        if (packageSection) packageSection.style.display = 'none';
        if (successMessage) successMessage.style.display = 'block';

        if (receiptName) receiptName.textContent = state.name;

        // If parent/guardian booked, display parent details row
        if (receiptParentRow && receiptParentName) {
            if (state.parentName && (state.role === 'A Parent' || state.role === 'A Guardian')) {
                receiptParentRow.style.display = 'flex';
                receiptParentName.textContent = state.parentName;
            } else {
                receiptParentRow.style.display = 'none';
            }
        }

        if (receiptPackage) {
            receiptPackage.textContent = `${state.selectedPackage.name} (₹${parseInt(state.selectedPackage.price, 10).toLocaleString('en-IN')})`;
        }
        if (receiptTime) receiptTime.textContent = `${state.day} at ${state.time} (15 Mins)`;
        if (receiptContact) receiptContact.textContent = state.contact;
        if (receiptTopic) receiptTopic.textContent = state.topic;
        if (receiptStyle) receiptStyle.textContent = state.sessionStyle;

        setupGoogleCalendarLink();
        launchConfetti();
    }

    function setupGoogleCalendarLink() {
        const title = encodeURIComponent("🧠 MindSet 15-Minute Micro-Coaching Sprint");
        const details = encodeURIComponent(
            `1-on-1 Micro-Coaching session with your Mind Mentor.\n\n` +
            `Student: ${state.name}\n` +
            (state.parentName ? `Parent: ${state.parentName}\n` : '') +
            `Package: ${state.selectedPackage.name} (₹${state.selectedPackage.price})\n` +
            `Focus Challenge: ${state.topic}\n` +
            `Preferred format: ${state.sessionStyle}\n` +
            `Notes: ${state.goalNotes || 'None'}\n\n` +
            `Session link will be shared via ${state.contactType === 'email' ? 'email' : 'SMS'} before the call.`
        );
        const location = encodeURIComponent("MindSet Video / WhatsApp Call");

        const now = new Date();
        if (state.day === 'Tomorrow') now.setDate(now.getDate() + 1);
        else if (state.day === 'Saturday') {
            const dayOfWeek = now.getDay();
            const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
            now.setDate(now.getDate() + daysUntilSat);
        }

        const dateStr = now.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 8);
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dateStr}T100000Z/${dateStr}T101500Z`;

        if (addToCalBtn) {
            addToCalBtn.onclick = () => window.open(gcalUrl, '_blank');
        }
    }

    if (bookAnotherBtn) {
        bookAnotherBtn.addEventListener('click', () => {
            if (successMessage) successMessage.style.display = 'none';
            if (bookingForm) {
                bookingForm.style.display = 'block';
                bookingForm.reset();
            }
            handleRoleChange();

            state.sessionStyle = 'Chat first';
            sessionStyleOptions.forEach(option => option.classList.toggle('active', option.dataset.style === state.sessionStyle));

            if (step1Pill) step1Pill.className = 'step-pill active';
            if (stepLine1) stepLine1.className = 'step-line';
            if (step2Pill) step2Pill.className = 'step-pill';
            if (stepLine2) stepLine2.className = 'step-line';
            if (step3Pill) step3Pill.className = 'step-pill';
            if (stepLine3) stepLine3.className = 'step-line';
            if (step4Pill) step4Pill.className = 'step-pill';

            if (bookingTitle) bookingTitle.textContent = 'Book Your 15-Minute Session';
            if (bookingSubtitle) bookingSubtitle.textContent = 'Choose your preferred time & verify contact details to reserve your coaching spot.';
        });
    }

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
        const colors = ['#d4af37', '#f5d77f', '#ffd700', '#ffffff', '#10b981', '#fbbf24'];

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
    // Focus Reset Planner: a tiny, saved action plan before a focus sprint
    // -------------------------------------------------------------------------
    const resetProfiles = {
        scrolling: {
            title: 'Make your phone less tempting',
            intro: 'A little distance is enough to let your attention settle.',
            first: 'Put your phone in another room or face-down across the room.',
            topic: '📱 Endless phone / TikTok / Instagram scrolling'
        },
        overwhelm: {
            title: 'Shrink the pile into one move',
            intro: 'You do not need to solve everything today — only choose the next visible piece.',
            first: 'Close every tab that is not needed for this one task.',
            topic: '🧠 Overwhelmed & anxious about upcoming exams'
        },
        starting: {
            title: 'Lower the starting line',
            intro: 'Momentum comes after the first imperfect minute, not before it.',
            first: 'Set out only the material you need and start without making it perfect.',
            topic: '⚡ Just need accountability to get started'
        }
    };

    function sanitizeTask(value) {
        return value.trim().replace(/\s+/g, ' ').slice(0, 120);
    }

    function saveFocusPlan() {
        try {
            localStorage.setItem('mindsetFocusPlan', JSON.stringify({
                mode: state.focusMode,
                task: state.microTask
            }));
        } catch (e) {
            // The planner remains useful even when browser storage is unavailable.
        }
    }

    function renderFocusPlan(announce = false) {
        const profile = resetProfiles[state.focusMode];
        const task = state.microTask || 'your smallest next task';
        if (focusPlanTitle) focusPlanTitle.textContent = profile.title;
        if (focusPlanIntro) focusPlanIntro.textContent = profile.intro;
        if (focusPlanSteps) {
            focusPlanSteps.innerHTML = '';
            const steps = [
                ['01', 'Clear the runway', profile.first],
                ['02', 'Touch the task', `For 10 quiet minutes: ${task}.`],
                ['03', 'Close the loop', 'Spend the last 2 minutes marking what moved and choosing the next tiny step.']
            ];
            steps.forEach(([number, title, detail]) => {
                const item = document.createElement('li');
                const index = document.createElement('span');
                const copy = document.createElement('p');
                const heading = document.createElement('strong');
                index.textContent = number;
                heading.textContent = title;
                copy.append(heading, document.createElement('br'), detail);
                item.append(index, copy);
                focusPlanSteps.appendChild(item);
            });
        }
        if (resetMemoryNote) {
            resetMemoryNote.textContent = announce ? 'Reset created and saved on this device. You only need to begin.' : 'Your plan stays on this device — no sign-up needed.';
        }
    }

    function createFocusPlan() {
        state.microTask = sanitizeTask(microTaskInput ? microTaskInput.value : '');
        if (microTaskInput) microTaskInput.value = state.microTask;
        renderFocusPlan(true);
        saveFocusPlan();
    }

    resetOptions.forEach(option => {
        option.addEventListener('click', () => {
            resetOptions.forEach(item => item.classList.remove('active'));
            option.classList.add('active');
            state.focusMode = option.dataset.resetMode || 'scrolling';
            renderFocusPlan();
        });
    });

    if (createFocusPlanBtn) createFocusPlanBtn.addEventListener('click', createFocusPlan);
    if (microTaskInput) {
        microTaskInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                createFocusPlan();
            }
        });
    }

    if (startPlannedSprintBtn) {
        startPlannedSprintBtn.addEventListener('click', () => {
            createFocusPlan();
            document.getElementById('quick-timer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (!state.timerIsRunning) startSoloTimer();
        });
    }

    if (usePlanForBookingBtn) {
        usePlanForBookingBtn.addEventListener('click', () => {
            createFocusPlan();
            const profile = resetProfiles[state.focusMode];
            if (topicSelect) topicSelect.value = profile.topic;
            if (goalNotesInput && state.microTask) goalNotesInput.value = `My next tiny step: ${state.microTask}.`;
            document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (goalNotesInput) goalNotesInput.focus({ preventScroll: true });
        });
    }

    // -------------------------------------------------------------------------
    // Comfort preference, audience guide, readiness nudge & weekly wins
    // -------------------------------------------------------------------------
    sessionStyleOptions.forEach(option => {
        option.addEventListener('click', () => {
            sessionStyleOptions.forEach(item => item.classList.remove('active'));
            option.classList.add('active');
            state.sessionStyle = option.dataset.style || 'Chat first';
        });
    });

    const audienceProfiles = {
        student: {
            eyebrow: 'FOR STUDENTS',
            title: 'Less pressure. More momentum.',
            description: 'Bring your unfinished assignment, exam anxiety, or scrolling spiral. Together, you’ll turn it into the next smallest action.',
            bullets: ['Camera is always optional', 'No judgement for missed routines', 'Leave with one clear step, not a giant system']
        },
        parent: {
            eyebrow: 'FOR PARENTS & GUARDIANS',
            title: 'Support without another argument.',
            description: 'A mentor can help your child build practical momentum while keeping the conversation calm, kind, and age-appropriate.',
            bullets: ['Choose a communication style that feels comfortable', 'Helpful context for the first session', 'A gentle complement to home routines']
        },
        teacher: {
            eyebrow: 'FOR TEACHERS',
            title: 'A small reset can change a whole week.',
            description: 'For students who are stuck, overwhelmed, or losing their study rhythm, MindSet creates an approachable starting point.',
            bullets: ['Useful for independent study challenges', 'Encourages student-owned next steps', 'Simple, low-pressure accountability']
        }
    };

    function renderAudience(profileName) {
        const profile = audienceProfiles[profileName];
        if (!profile) return;
        if (audienceEyebrow) audienceEyebrow.textContent = profile.eyebrow;
        if (audienceTitle) audienceTitle.textContent = profile.title;
        if (audienceDescription) audienceDescription.textContent = profile.description;
        if (audienceList) {
            audienceList.innerHTML = '';
            profile.bullets.forEach(bullet => {
                const item = document.createElement('li');
                item.textContent = bullet;
                audienceList.appendChild(item);
            });
        }
    }

    audienceTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            audienceTabs.forEach(item => {
                const active = item === tab;
                item.classList.toggle('active', active);
                item.setAttribute('aria-selected', String(active));
            });
            renderAudience(tab.dataset.audience);
        });
    });

    const readinessProfiles = {
        start: { title: 'You do not have to feel ready to begin.', text: 'Try opening the material and staying with it for just two minutes. Starting is the win.', focusMode: 'starting' },
        stress: { title: 'You only need to hold one thing at a time.', text: 'Write down every urgent thought, then circle the smallest thing that helps tomorrow-you.', focusMode: 'overwhelm' },
        routine: { title: 'A routine can restart with one kind choice.', text: 'Pick one repeatable cue for today: sit down, set a timer, and do the first visible step.', focusMode: 'starting' }
    };

    readinessOptions.forEach(option => {
        option.addEventListener('click', () => {
            readinessOptions.forEach(item => item.classList.remove('active'));
            option.classList.add('active');
            const profile = readinessProfiles[option.dataset.readiness];
            if (profile && readinessResult) {
                readinessResult.querySelector('h3').textContent = profile.title;
                readinessResult.querySelector('p').textContent = profile.text;
                readinessResult.dataset.focusMode = profile.focusMode;
            }
        });
    });

    if (readinessPlanBtn) {
        readinessPlanBtn.addEventListener('click', () => {
            const suggestedMode = readinessResult?.dataset.focusMode;
            if (suggestedMode && resetProfiles[suggestedMode]) {
                state.focusMode = suggestedMode;
                resetOptions.forEach(option => option.classList.toggle('active', option.dataset.resetMode === suggestedMode));
                renderFocusPlan();
            }
            document.getElementById('focus-reset')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => microTaskInput?.focus({ preventScroll: true }), 450);
        });
    }

    function refreshWins() {
        const completed = [...dayWins].filter(day => day.classList.contains('complete')).length;
        if (!winsMessage) return;
        if (completed === 0) winsMessage.textContent = 'A clean slate is a good place to begin.';
        else if (completed === 1) winsMessage.textContent = 'One intentional start — that counts.';
        else if (completed < 5) winsMessage.textContent = `${completed} small wins this week. Keep it gentle.`;
        else winsMessage.textContent = `${completed} small wins this week. You are building trust with yourself.`;
    }

    function saveWins() {
        try {
            const activeDays = [...dayWins].filter(day => day.classList.contains('complete')).map(day => day.dataset.day);
            localStorage.setItem('mindsetWeeklyWins', JSON.stringify(activeDays));
        } catch (e) {}
    }

    dayWins.forEach(day => {
        day.addEventListener('click', () => {
            day.classList.toggle('complete');
            saveWins();
            refreshWins();
        });
    });

    if (clearWinsBtn) {
        clearWinsBtn.addEventListener('click', () => {
            dayWins.forEach(day => day.classList.remove('complete'));
            saveWins();
            refreshWins();
        });
    }

    try {
        const savedWins = JSON.parse(localStorage.getItem('mindsetWeeklyWins') || '[]');
        if (Array.isArray(savedWins)) dayWins.forEach(day => day.classList.toggle('complete', savedWins.includes(day.dataset.day)));
    } catch (e) {}
    refreshWins();

    try {
        const savedFocusPlan = JSON.parse(localStorage.getItem('mindsetFocusPlan') || 'null');
        if (savedFocusPlan && resetProfiles[savedFocusPlan.mode]) {
            state.focusMode = savedFocusPlan.mode;
            state.microTask = sanitizeTask(savedFocusPlan.task || '');
            resetOptions.forEach(option => option.classList.toggle('active', option.dataset.resetMode === state.focusMode));
            if (microTaskInput) microTaskInput.value = state.microTask;
            renderFocusPlan();
            if (resetMemoryNote && state.microTask) resetMemoryNote.textContent = 'Your last reset is ready whenever you are.';
        }
    } catch (e) {
        renderFocusPlan();
    }

    // -------------------------------------------------------------------------
    // Interactive Feature 1: Solo Sprint 15-Minute Focus Timer
    // -------------------------------------------------------------------------
    function updateTimerDisplay() {
        if (!timerDigits) return;
        const mins = Math.floor(state.timerSeconds / 60);
        const secs = state.timerSeconds % 60;
        timerDigits.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    if (timerToggleBtn) {
        timerToggleBtn.addEventListener('click', () => {
            if (state.timerIsRunning) {
                pauseSoloTimer();
            } else {
                startSoloTimer();
            }
        });
    }

    if (timerResetBtn) {
        timerResetBtn.addEventListener('click', () => {
            pauseSoloTimer();
            state.timerSeconds = state.timerInitialSeconds;
            updateTimerDisplay();
            if (timerStatus) timerStatus.textContent = 'Ready to focus?';
        });
    }

    function startSoloTimer() {
        state.timerIsRunning = true;
        if (timerToggleBtn) timerToggleBtn.textContent = '⏸ Pause Sprint';
        if (timerStatus) timerStatus.textContent = '🔥 Focus session in progress... Keep going!';

        state.timerInterval = setInterval(() => {
            if (state.timerSeconds > 0) {
                state.timerSeconds--;
                updateTimerDisplay();
            } else {
                pauseSoloTimer();
                if (timerStatus) timerStatus.textContent = '🎉 Sprint Completed! Take a well-deserved 5-min break.';
                launchConfetti();
            }
        }, 1000);
    }

    function pauseSoloTimer() {
        state.timerIsRunning = false;
        clearInterval(state.timerInterval);
        if (timerToggleBtn) timerToggleBtn.textContent = '▶ Start 15-Min Sprint';
        if (state.timerSeconds > 0 && state.timerSeconds < state.timerInitialSeconds) {
            if (timerStatus) timerStatus.textContent = 'Paused. Click start when ready to resume.';
        }
    }

    // -------------------------------------------------------------------------
    // Web Audio Synthesized Ambient Background Sounds
    // -------------------------------------------------------------------------
    let audioCtx = null;
    let activeNoiseNode = null;
    let activeGainNode = null;

    function initAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
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
    }

    function playAmbientSound(type) {
        initAudioContext();
        stopAmbientSound();

        if (type === 'silent') return;

        if (type === '852hz') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(852, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            activeNoiseNode = osc;
            activeGainNode = gain;
            return;
        }

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
            gainNode.gain.value = 0.12;
        } else if (type === 'whitenoise') {
            filter.type = 'bandpass';
            filter.frequency.value = 1200;
            gainNode.gain.value = 0.08;
        } else if (type === 'cafe') {
            filter.type = 'lowpass';
            filter.frequency.value = 500;
            gainNode.gain.value = 0.15;
        }

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        whiteNoise.start();
        activeNoiseNode = whiteNoise;
        activeGainNode = gainNode;
    }

    soundPills.forEach(pill => {
        pill.addEventListener('click', () => {
            soundPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const soundType = pill.dataset.sound;
            state.activeSound = soundType;
            playAmbientSound(soundType);
        });
    });
});
