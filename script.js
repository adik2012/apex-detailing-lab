"use strict";

const IS_DEMO_HOST = window.location.hostname.endsWith(".github.io");

const PRICING = {
  classes: {
    class1: { label: "Седан / Купе / Хэтчбек", examples: "BMW 3/5, Mercedes C/E, Audi A4/A6, Porsche 911", factor: 1.0 },
    class2: { label: "Кроссовер / Бизнес-седан", examples: "BMW X3/X5, Porsche Cayenne, Mercedes GLE/S-Class, Geely Monjaro", factor: 1.2 },
    class3: { label: "Внедорожник / Минивэн / Люкс", examples: "BMW X7, Mercedes G-Class / V-Class, Range Rover, LiXiang L9, Cadillac Escalade", factor: 1.5 }
  },
  services: {
    "srv-1": { name: "Восстановительная детейлинг-полировка ЛКП", price: { class1: 24000, class2: 29000, class3: 36000 }, hours: { class1: 10, class2: 12, class3: 15 }, warranty: "Протокол замеров ЛКП по 12 точкам каждой панели" },
    "srv-2": { name: "Нанокерамика 9H в 2 слоя + гидрофобный топ-слой", price: { class1: 38000, class2: 45000, class3: 55000 }, hours: { class1: 12, class2: 14, class3: 18 }, warranty: "24 месяца по договору + осмотр каждые 12 мес" },
    "srv-3": { name: "Бронирование «Зоны риска» PPF 200 мкм", price: { class1: 95000, class2: 115000, class3: 140000 }, hours: { class1: 24, class2: 28, class3: 32 }, warranty: "5 лет от пожелтения, отслоений и трещин" },
    "srv-4": { name: "Детейлинг-химчистка салона с консервацией кожи", price: { class1: 18000, class2: 22000, class3: 28000 }, hours: { class1: 8, class2: 10, class3: 14 }, warranty: "14 дней на повторное выведение пятен — бесплатно" },
    "srv-5": { name: "Комплекс «Антидождь» на все стекла + полировка фар", price: { class1: 7500, class2: 9000, class3: 11000 }, hours: { class1: 3, class2: 4, class3: 5 }, warranty: "12 месяцев на гидрофобный эффект стекол" },
    "srv-6": { name: "Детейлинг моторного отсека диэлектрическим гелем", price: { class1: 6000, class2: 7500, class3: 9000 }, hours: { class1: 3, class2: 3, class3: 4 }, warranty: "Чек-лист изоляции электрики из 14 пунктов" }
  },
  packages: {
    "pkg-1": { name: "Керамическое зеркало", services: ["srv-1", "srv-2", "srv-5"], price: { class1: 57900, class2: 69500, class3: 84500 } },
    "pkg-2": { name: "Броня трассы PPF", services: ["srv-3", "srv-5"], price: { class1: 86500, class2: 104500, class3: 127000 } },
    "pkg-3": { name: "Полная перезагрузка", services: ["srv-1", "srv-2", "srv-4", "srv-6"], price: { class1: 70500, class2: 84500, class3: 104500 } }
  },
  rules: {
    comboDiscount: 0.15,
    comboMinServices: 2,
    promo: { code: "APEX10", discount: 0.10 },
    giftThreshold: 35000,
    gift: { name: "Озонация салона + антибактериальная обработка кондиционера", listPrice: 4500 },
    workdayHours: 10
  }
};

const MASTERS = {
  "master-1": { name: "Артем", role: "Шеф-детейлер · Бокс №1 — Полировка и керамика", box: "Бокс №1", services: ["srv-1", "srv-2", "srv-5"] },
  "master-2": { name: "Максим", role: "Ведущий мастер по антигравийным пленкам PPF · Бокс №2 — Чистая зона PPF-пленки", box: "Бокс №2", services: ["srv-3"] },
  "master-3": { name: "Иван", role: "Специалист по нанокерамике и защите стекол · Бокс №1 — Полировка и керамика", box: "Бокс №1", services: ["srv-2", "srv-5"] },
  "master-4": { name: "Дмитрий", role: "Мастер реставрации и химчистки интерьеров · Бокс №3 — Детейлинг интерьера", box: "Бокс №3", services: ["srv-4", "srv-6"] }
};

const PACKAGE_COMPONENT_NAMES = {
  "srv-1": "Полировка ЛКП",
  "srv-2": "Керамика 9H",
  "srv-3": "Бронирование PPF",
  "srv-4": "Химчистка салона",
  "srv-5": "Антидождь и фары",
  "srv-6": "Детейлинг моторного отсека"
};
const BOOKING_API_ERROR = "Не удалось отправить заявку: сервер недоступен. Позвоните нам: +7 (900) 000-00-00";
const state = {
  carClass: "class1",
  services: [],
  package: null,
  promo: null,
  selectedDate: null,
  selectedSlot: null,
  ownBlockedDate: null,
  sending: false
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const formatPrice = amount => `${new Intl.NumberFormat("ru-RU").format(amount)} ₽`;
const dateISO = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const slots = ["10:00", "12:00", "14:00", "16:00", "18:00"];
const busySlots = new Set(["1:12:00", "3:10:00", "5:18:00", "8:14:00"]);

function getHours() {
  return state.services.reduce((sum, id) => sum + PRICING.services[id].hours[state.carClass], 0);
}

function calculate() {
  const packageData = state.package ? PRICING.packages[state.package] : null;
  const extras = packageData ? state.services.filter(id => !packageData.services.includes(id)) : state.services;
  const serviceTotal = state.services.reduce((sum, id) => sum + PRICING.services[id].price[state.carClass], 0);
  const base = (packageData ? packageData.price[state.carClass] : 0) +
    extras.reduce((sum, id) => sum + PRICING.services[id].price[state.carClass], 0);
  const comboBase = packageData
    ? extras.reduce((sum, id) => sum + PRICING.services[id].price[state.carClass], 0)
    : serviceTotal;
  const combo = (packageData ? extras.length : state.services.length) >= PRICING.rules.comboMinServices
    ? Math.round(comboBase * PRICING.rules.comboDiscount)
    : 0;
  const amount = base - combo;
  const promo = state.promo === PRICING.rules.promo.code
    ? Math.round(amount * PRICING.rules.promo.discount)
    : 0;
  const total = amount - promo;
  const hours = getHours();
  const packageSavings = packageData
    ? packageData.services.reduce((sum, id) => sum + PRICING.services[id].price[state.carClass], 0) - packageData.price[state.carClass]
    : 0;
  return {
    base,
    combo,
    promo,
    total,
    hours,
    gift: total >= PRICING.rules.giftThreshold,
    extras,
    packageSavings,
    serviceTotal
  };
}

function saveBuilder() {
  try {
    localStorage.setItem("apex_class", state.carClass);
    localStorage.setItem("apex_services", JSON.stringify(state.services));
    localStorage.setItem("apex_package", state.package || "");
  } catch (error) {
    console.warn("Не удалось сохранить состав комплекса в localStorage.", error);
  }
}

function restoreBuilder() {
  try {
    const savedClass = localStorage.getItem("apex_class");
    const savedServices = JSON.parse(localStorage.getItem("apex_services") || "[]");
    const savedPackage = localStorage.getItem("apex_package");
    if (Object.prototype.hasOwnProperty.call(PRICING.classes, savedClass)) state.carClass = savedClass;
    if (Array.isArray(savedServices)) {
      state.services = [...new Set(savedServices.filter(id => Object.prototype.hasOwnProperty.call(PRICING.services, id)))];
    }
    if (Object.prototype.hasOwnProperty.call(PRICING.packages, savedPackage)) {
      state.package = savedPackage;
      state.services = [...new Set([...state.services, ...PRICING.packages[savedPackage].services])];
    }
  } catch (error) {
    console.warn("Не удалось восстановить состав комплекса из localStorage.", error);
    state.carClass = "class1";
    state.services = [];
    state.package = null;
  }
}

function renderPackageCards() {
  Object.entries(PRICING.packages).forEach(([id, packageData]) => {
    const price = packageData.price[state.carClass];
    const includedTotal = packageData.services.reduce((sum, serviceId) => sum + PRICING.services[serviceId].price[state.carClass], 0);
    const hours = packageData.services.reduce((sum, serviceId) => sum + PRICING.services[serviceId].hours[state.carClass], 0);
    const includes = $(`[data-package-includes="${id}"]`);
    if (includes) {
      includes.innerHTML = packageData.services.map(serviceId =>
        `<li><span>${escapeHTML(PACKAGE_COMPONENT_NAMES[serviceId])}</span><span>${formatPrice(PRICING.services[serviceId].price[state.carClass])}</span></li>`
      ).join("");
    }
    const priceElement = $(`[data-package-price="${id}"]`);
    const benefitElement = $(`[data-package-benefit="${id}"]`);
    const hoursElement = $(`[data-package-hours="${id}"]`);
    if (priceElement) priceElement.textContent = formatPrice(price);
    if (benefitElement) benefitElement.textContent = formatPrice(includedTotal - price);
    if (hoursElement) hoursElement.textContent = `~${hours} ч`;
    const card = $(`[data-package-card="${id}"]`);
    const button = $(`[data-select-package="${id}"]`);
    if (card) card.classList.toggle("is-selected", state.package === id);
    if (button) {
      button.textContent = state.package === id ? "✓ Активен" : "Выбрать пакет";
      button.setAttribute("aria-pressed", String(state.package === id));
    }
  });
}

function renderServiceCards() {
  Object.entries(PRICING.services).forEach(([id, service]) => {
    const price = $(`[data-service-price="${id}"]`);
    const hours = $(`[data-service-hours="${id}"]`);
    const card = $(`[data-service-card="${id}"]`);
    const button = $(`[data-toggle-service="${id}"]`);
    if (price) price.textContent = formatPrice(service.price[state.carClass]);
    if (hours) hours.textContent = `~${service.hours[state.carClass]} ч`;
    const selected = state.services.includes(id);
    if (card) card.classList.toggle("is-selected", selected);
    if (button) {
      button.textContent = selected ? "✓ В комплексе" : "Добавить в комплекс";
      button.setAttribute("aria-pressed", String(selected));
    }
  });
}

function getPackageSuggestion() {
  if (state.package || !state.services.length) return null;
  return Object.entries(PRICING.packages).find(([, item]) =>
    item.services.length === state.services.length && item.services.every(id => state.services.includes(id))
  ) || null;
}

function renderEstimate() {
  const result = calculate();
  const summary = $("[data-estimate-summary]");
  const className = PRICING.classes[state.carClass].label;
  if (!state.services.length) {
    summary.innerHTML = `<span class="estimate-class">${escapeHTML(className)}</span><p class="estimate-empty">Комплекс не собран. Начните с полировки — это фундамент любого покрытия. <a href="#services" data-add-foundation>Добавить полировку</a></p>`;
  } else {
    const visibleServices = state.package
      ? state.services.filter(id => !PRICING.packages[state.package].services.includes(id))
      : state.services;
    const serviceRows = visibleServices.map(id =>
      `<div class="estimate-line"><span>${escapeHTML(PACKAGE_COMPONENT_NAMES[id])}</span><strong>${formatPrice(PRICING.services[id].price[state.carClass])}</strong></div>`
    ).join("");
    const packageRow = state.package
      ? `<div class="estimate-line package-line"><span>Пакет «${escapeHTML(PRICING.packages[state.package].name)}»</span><strong>${formatPrice(PRICING.packages[state.package].price[state.carClass])} · выгода ${formatPrice(result.packageSavings)}</strong></div>`
      : "";
    const comboRow = result.combo
      ? `<div class="estimate-line discount"><span>Комплекс −15%</span><strong>−${formatPrice(result.combo)}</strong></div>`
      : "";
    const promoRow = result.promo
      ? `<div class="estimate-line discount"><span>APEX10 −10%</span><strong>−${formatPrice(result.promo)}</strong></div>`
      : "";
    const giftRow = result.gift
      ? `<div class="estimate-line gift"><span>Озонация салона + антибактериальная обработка — ПОДАРОК</span><strong><s>${formatPrice(PRICING.rules.gift.listPrice)}</s> 0 ₽</strong></div>`
      : "";
    summary.innerHTML = `<span class="estimate-class">${escapeHTML(className)}</span>${packageRow}${serviceRows}${comboRow}${promoRow}${giftRow}`;
  }
  const progress = $("[data-gift-progress]");
  const giftMessage = $("[data-gift-message]");
  const progressBlock = $(".gift-progress");
  if (progress) progress.style.width = `${Math.min(100, result.total / PRICING.rules.giftThreshold * 100)}%`;
  if (giftMessage) {
    giftMessage.textContent = result.gift
      ? `Подарок ваш: ${PRICING.rules.gift.name} (${formatPrice(PRICING.rules.gift.listPrice)}) — бесплатно`
      : state.services.length
        ? `Добавьте услуг еще на ${formatPrice(PRICING.rules.giftThreshold - result.total)}, чтобы получить озонацию салона в подарок`
        : "Соберите комплекс — подарок появится в смете";
  }
  if (progressBlock) progressBlock.classList.toggle("is-active", result.gift);
  const suggestion = getPackageSuggestion();
  const suggestionNode = $("[data-package-suggestion]");
  if (suggestionNode) {
    if (suggestion) {
      const [id, packageData] = suggestion;
      const benefit = result.serviceTotal - packageData.price[state.carClass];
      suggestionNode.hidden = false;
      suggestionNode.innerHTML = `Активируйте пакет «${escapeHTML(packageData.name)}» — выгода еще ${formatPrice(benefit)}<button type="button" data-activate-suggested="${id}">Выбрать этот пакет</button>`;
    } else {
      suggestionNode.hidden = true;
      suggestionNode.textContent = "";
    }
  }
  const totalNode = $("[data-estimate-total]");
  if (totalNode) {
    totalNode.textContent = formatPrice(result.total);
    totalNode.classList.remove("is-updated");
    requestAnimationFrame(() => totalNode.classList.add("is-updated"));
    window.setTimeout(() => totalNode.classList.remove("is-updated"), 320);
  }
  const estimateHours = $("[data-estimate-hours]");
  if (estimateHours) estimateHours.textContent = result.hours ? `~${result.hours} ч работы · около ${Math.ceil(result.hours / PRICING.rules.workdayHours)} рабочих дней в боксе` : "Добавьте услуги, чтобы увидеть срок работ";
  const savings = $("[data-estimate-savings]");
  if (savings) savings.textContent = result.combo ? `Ваша выгода по комплексу: ${formatPrice(result.combo)}` : "";
  const header = $("[data-scroll-estimate]");
  const headerText = state.services.length ? `Комплекс: ${state.services.length} ${state.services.length === 1 ? "услуга" : "услуги"} · ` : "Комплекс: 0 услуг";
  if (header) header.innerHTML = state.services.length ? `${headerText}<strong>${formatPrice(result.total)}</strong>` : headerText;
  const mobileLabel = $("[data-mobile-estimate-label]");
  if (mobileLabel) mobileLabel.textContent = `Смета · ${state.services.length} ${state.services.length === 1 ? "услуга" : "услуги"}`;
  const mobileTotal = $("[data-mobile-estimate-total]");
  if (mobileTotal) mobileTotal.textContent = formatPrice(result.total);
  const bookingTotal = $("[data-booking-summary]");
  const bookingClassLabel = $("[data-class-label]");
  if (bookingClassLabel) bookingClassLabel.textContent = `Класс по прайсу: ${className} — цены уже пересчитаны`;
  if (bookingTotal) renderBookingSummary(bookingTotal, result);
  renderMasterAdvisory();
  renderSlots();
  updateSubmitState();
}

function renderBookingSummary(node, result = calculate()) {
  if (!state.services.length) {
    node.innerHTML = '<div class="form-summary-content"><p>Комплекс не собран. <a href="#services">Собрать комплекс</a>, чтобы записаться.</p></div>';
    return;
  }
  const selectedLabel = state.package
    ? `Пакет «${escapeHTML(PRICING.packages[state.package].name)}»`
    : state.services.map(id => escapeHTML(PACKAGE_COMPONENT_NAMES[id])).join(", ");
  const discountRows = [
    result.combo ? `<p>Комплекс −15%: −${formatPrice(result.combo)}</p>` : "",
    result.promo ? `<p>APEX10 −10%: −${formatPrice(result.promo)}</p>` : "",
    result.gift ? `<p class="gift-line">Подарок: ${escapeHTML(PRICING.rules.gift.name)}</p>` : ""
  ].filter(Boolean).join("");
  node.innerHTML = `<div class="form-summary-content"><p>${escapeHTML(PRICING.classes[state.carClass].label)}</p><p>${selectedLabel}</p>${discountRows}<div class="form-summary-total"><span>Итого</span><strong>${formatPrice(result.total)}</strong></div><p>Длительность: ${result.hours} ч</p></div>`;
}

function renderMasterAdvisory() {
  const advisory = $("[data-master-advisory]");
  const masterId = $("#booking-master")?.value;
  const master = MASTERS[masterId];
  if (!advisory || !master || !state.services.length) {
    if (advisory) advisory.hidden = true;
    return;
  }
  advisory.hidden = !state.services.some(id => !master.services.includes(id));
}

function applyPromo(input, feedback) {
  const code = input.value.trim().toUpperCase();
  feedback.classList.remove("is-success");
  if (code !== PRICING.rules.promo.code) {
    state.promo = null;
    feedback.textContent = "Промокод не найден. Проверьте написание";
  } else {
    state.promo = code;
    input.value = code;
    feedback.textContent = "APEX10 −10% применен";
    feedback.classList.add("is-success");
  }
  const otherInput = input.id === "estimate-promo" ? $("#booking-promo") : $("#estimate-promo");
  if (otherInput) otherInput.value = state.promo || code;
  renderEstimate();
  const otherFeedback = input.id === "estimate-promo" ? $("[data-booking-promo-feedback]") : $("[data-estimate-promo-feedback]");
  if (otherFeedback) {
    otherFeedback.textContent = feedback.textContent;
    otherFeedback.classList.toggle("is-success", Boolean(state.promo));
  }
}

function choosePackage(packageId) {
  state.package = packageId;
  state.services = [...new Set([...state.services, ...PRICING.packages[packageId].services])];
  saveBuilder();
  renderAll();
}

function toggleService(serviceId) {
  if (state.services.includes(serviceId)) {
    state.services = state.services.filter(id => id !== serviceId);
    if (state.package && PRICING.packages[state.package].services.includes(serviceId)) state.package = null;
  } else {
    state.services.push(serviceId);
  }
  saveBuilder();
  renderAll();
}

function renderAll() {
  const classRadio = $(`input[name="car-class"][value="${state.carClass}"]`);
  if (classRadio) classRadio.checked = true;
  renderPackageCards();
  renderServiceCards();
  renderEstimate();
}

function generateDates() {
  const container = $("[data-date-picker]");
  if (!container) return;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const shortDays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const dates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index + 1);
    return date;
  });
  container.innerHTML = dates.map((date, index) => {
    const id = dateISO(date);
    const display = `${shortDays[date.getDay()]}, ${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
    return `<button type="button" class="date-chip" data-date="${id}" aria-pressed="false"><strong>${index === 0 ? "Завтра" : display}</strong><small>${index === 0 ? display : "Свободная дата"}</small></button>`;
  }).join("");
}

function getDateOffset(isoDate) {
  if (!isoDate) return -1;
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  return Math.round((target - base) / 86400000);
}

function renderSlots() {
  const container = $("[data-slot-picker]");
  const message = $("[data-slot-message]");
  const estimate = $("[data-booking-estimate]");
  if (!container) return;
  const offset = getDateOffset(state.selectedDate);
  const hours = getHours();
  if (state.selectedSlot) {
    const selectedStartHour = Number(state.selectedSlot.slice(0, 2));
    const noLongerFits = hours > 0 && hours <= PRICING.rules.workdayHours && hours > 20 - selectedStartHour;
    if (busySlots.has(`${offset}:${state.selectedSlot}`) || noLongerFits) {
      state.selectedSlot = null;
      state.ownBlockedDate = null;
    }
  }
  const occupancyDays = state.ownBlockedDate === state.selectedDate && hours > 4;
  container.innerHTML = slots.map(slot => {
    const startHour = Number(slot.slice(0, 2));
    const tooLong = hours > 0 && hours <= PRICING.rules.workdayHours && hours > 20 - startHour;
    const busy = busySlots.has(`${offset}:${slot}`);
    const occupiedByVisit = occupancyDays && state.selectedSlot !== slot;
    const disabled = !state.selectedDate || !hours || busy || tooLong || occupiedByVisit;
    const title = busy ? "На этот слот уже стоит авто" : tooLong ? "Не успеваем в этот день" : occupiedByVisit ? "Занято вашим визитом" : "";
    const pressed = state.selectedSlot === slot && !disabled;
    return `<button class="slot-chip" type="button" data-slot="${slot}" aria-pressed="${pressed}" ${disabled ? "disabled" : ""} ${title ? `title="${title}" aria-label="${slot}: ${title}"` : ""}>${slot}${busy ? "<small>Занято</small>" : tooLong ? "<small>Не успеваем</small>" : occupiedByVisit ? "<small>Ваш визит</small>" : ""}</button>`;
  }).join("");
  if (message) {
    message.classList.remove("is-error");
    message.textContent = !state.selectedDate
      ? "Сначала выберите дату заезда."
      : !hours
        ? "Добавьте услуги, чтобы проверить доступность времени."
        : state.selectedSlot
          ? `Выбран заезд ${state.selectedSlot}.`
          : "Выберите свободное время заезда.";
  }
  if (!estimate) return;
  if (state.selectedDate && state.selectedSlot && hours > 4) {
    const days = Math.ceil(hours / PRICING.rules.workdayHours);
    const pickupDate = new Date(`${state.selectedDate}T12:00:00`);
    pickupDate.setDate(pickupDate.getDate() + days - 1);
    const formattedPickup = new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "2-digit" }).format(pickupDate);
    const taxi = hours >= 8
      ? "<strong>Подменное такси бизнес-класса — за наш счет</strong>: отвезем вас домой после заезда и вернем на выдачу."
      : "Автомобиль остается в боксе под видеонаблюдением.";
    estimate.hidden = false;
    estimate.innerHTML = `Длительность работ: <strong>${hours} ч</strong> (около <strong>${days} рабочих дней</strong>). Автомобиль остается в боксе под видеонаблюдением. ${taxi} Ориентировочная выдача: <strong>${escapeHTML(formattedPickup)}, после 18:00</strong>.`;
    state.ownBlockedDate = state.selectedDate;
  } else {
    estimate.hidden = true;
    estimate.textContent = "";
    if (!state.selectedSlot || hours <= 4) state.ownBlockedDate = null;
  }
  updateSubmitState();
}

function updateSubmitState() {
  const form = $("#booking-form");
  if (!form) return;
  const consent = $("#personal-consent")?.checked === true;
  const submit = $("[data-submit-button]", form);
  const hasSelection = state.services.length > 0;
  if (submit) {
    submit.disabled = !consent || !hasSelection || state.sending;
    const method = $('input[name="confirmMethod"]:checked', form)?.value || "onsite";
    const label = $("[data-submit-label]", submit);
    if (label) {
      label.textContent = method === "sbp" ? "Показать QR СБП" : method === "messenger" ? "Отправить расчет в Telegram / WhatsApp" : "Подтвердить запись";
    }
  }
  $$("[data-share]", form).forEach(button => { button.disabled = !consent || !hasSelection || state.sending; });
  const hint = $("[data-consent-hint]");
  if (hint) hint.hidden = consent;
}

function formatPhone(digits) {
  const value = digits.slice(0, 10);
  let output = "+7 (";
  output += value.slice(0, 3);
  if (value.length >= 3) output += ") ";
  if (value.length > 3) output += value.slice(3, 6);
  if (value.length >= 6) output += "-";
  if (value.length > 6) output += value.slice(6, 8);
  if (value.length >= 8) output += "-";
  if (value.length > 8) output += value.slice(8, 10);
  return output;
}

function validateForm(form) {
  const errors = [];
  const name = $("#customer-name", form).value.trim();
  const carModel = $("#car-model", form).value.trim();
  const phoneDigits = $("#customer-phone", form).value.replace(/\D/g, "");
  if (!state.services.length) errors.push("Сначала соберите комплекс из услуг.");
  if (name.length < 2 || name.length > 40 || !/^[\p{L}\s-]+$/u.test(name)) errors.push("Имя должно содержать от 2 до 40 букв.");
  if (!carModel || carModel.length > 60) errors.push("Укажите марку и модель автомобиля (до 60 символов).");
  if (phoneDigits.length !== 11 || !phoneDigits.startsWith("7")) errors.push("Введите полный номер в формате +7 (___) ___-__-__.");
  if (!state.selectedDate || !state.selectedSlot) errors.push("Выберите дату и свободное время заезда.");
  if (!$("#personal-consent", form).checked) errors.push("Необходимо согласие на обработку персональных данных.");
  return { errors, phone: `+${phoneDigits}`, name, carModel };
}

function orderPayload(form, values) {
  return {
    action: "create_order",
    carClass: state.carClass,
    package: state.package,
    services: state.services,
    promo: state.promo,
    master: $("#booking-master", form).value,
    date: state.selectedDate,
    slot: state.selectedSlot,
    carModel: values.carModel,
    name: values.name,
    phone: values.phone,
    confirmMethod: $('input[name="confirmMethod"]:checked', form).value,
    consent: $("#personal-consent", form).checked,
    website: $("[name=website]", form).value
  };
}

function showSuccess(orderId, payload, isDemo) {
  const panel = $("[data-booking-success]");
  const title = $("[data-success-title]");
  const summary = $("[data-success-summary]");
  const demoBadge = $("[data-demo-badge]");
  if (!panel) return;
  title.textContent = `Бронь принята — номер ${orderId}`;
  demoBadge.hidden = !isDemo;
  if (summary) {
    const master = MASTERS[payload.master];
    const masterText = master ? `${master.name} · ${master.box}` : "Любой свободный мастер";
    summary.innerHTML = `<div class="form-summary-content"><p>${escapeHTML(PRICING.classes[payload.carClass].label)}</p><p>${payload.services.map(id => escapeHTML(PACKAGE_COMPONENT_NAMES[id])).join(", ")}</p><p>${escapeHTML(payload.date)} · ${escapeHTML(payload.slot)} · ${escapeHTML(masterText)}</p><div class="form-summary-total"><span>Итого</span><strong>${formatPrice(calculate().total)}</strong></div></div>${isDemo ? '<p class="demo-note">Статичный хостинг портфолио: заявка не отправляется на сервер.</p>' : ""}`;
  }
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function submitBooking(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorBox = $("[data-form-errors]", form);
  const validation = validateForm(form);
  errorBox.textContent = validation.errors.join(" ");
  if (validation.errors.length) return;
  const payload = orderPayload(form, validation);
  const button = $("[data-submit-button]", form);
  state.sending = true;
  button.classList.add("is-loading");
  button.disabled = true;
  try {
    if (IS_DEMO_HOST) {
      const demoId = `APEX-DEMO-${String(Math.floor(1000 + Math.random() * 9000))}`;
      showSuccess(demoId, payload, true);
      if (payload.confirmMethod === "sbp") openModal("sbp");
      return;
    }
    const response = await fetch("send.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const responseData = await response.json();
    if (!response.ok || responseData.ok !== true) {
      const message = responseData?.error?.message || BOOKING_API_ERROR;
      throw new Error(message);
    }
    showSuccess(responseData.orderId, payload, false);
    if (payload.confirmMethod === "sbp") openModal("sbp");
  } catch (error) {
    console.error("Не удалось отправить заявку.", error);
    errorBox.textContent = error.message && error.message !== "Failed to fetch" ? error.message : BOOKING_API_ERROR;
  } finally {
    state.sending = false;
    button.classList.remove("is-loading");
    updateSubmitState();
  }
}

let toastTimer;
function showToast(message) {
  const toast = $("[data-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 4200);
}

function openModal(name) {
  const modal = $(`[data-modal="${name}"]`);
  if (!modal) return;
  modal.hidden = false;
  $("body").classList.add("modal-open");
  $("[data-close-modal]", modal)?.focus();
}

function closeModal(modal) {
  if (modal) modal.hidden = true;
  if (!$("[data-modal]:not([hidden])")) $("body").classList.remove("modal-open");
}

function closeMenu() {
  const menu = $("#primary-nav");
  const toggle = $(".menu-toggle");
  if (!menu || !toggle) return;
  menu.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Открыть меню");
  $("body").classList.remove("menu-open");
}

function shareEstimate(platform) {
  const consent = $("#personal-consent")?.checked === true;
  if (!consent || !state.services.length || state.sending) {
    updateSubmitState();
    return;
  }
  const result = calculate();
  const serviceText = state.services.map(id => PACKAGE_COMPONENT_NAMES[id]).join(", ");
  const message = `APEX DETAILING LAB · ${PRICING.classes[state.carClass].label} · ${serviceText} · ${formatPrice(result.total)}${state.promo ? " · APEX10 −10%" : ""}`;
  const pageUrl = "https://adik2012.github.io/apex-detailing-lab/";
  const url = platform === "whatsapp"
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(`${message} ${pageUrl}`)}`
    : `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function initComparison() {
  const slider = $("[data-comparison]");
  const range = $(".comparison-range", slider || document);
  if (!slider || !range) return;
  const setPosition = value => slider.style.setProperty("--split", `${Math.min(100, Math.max(0, Number(value)))}%`);
  range.addEventListener("input", () => setPosition(range.value));
  slider.addEventListener("pointerdown", event => {
    if (event.target === range) return;
    slider.setPointerCapture(event.pointerId);
    updateFromPointer(event);
  });
  slider.addEventListener("pointermove", event => {
    if (slider.hasPointerCapture(event.pointerId)) updateFromPointer(event);
  });
  const updateFromPointer = event => {
    const rect = slider.getBoundingClientRect();
    const percentage = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    range.value = String(percentage);
    setPosition(percentage);
  };
  range.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      range.value = String(Math.max(0, Math.min(100, Number(range.value) + (event.key === "ArrowRight" ? 2 : -2))));
      setPosition(range.value);
    }
  });
}

function initReveals() {
  const revealItems = $$(".reveal");
  const tagline = $("[data-tagline]");
  if (tagline) {
    const text = tagline.innerHTML;
    const tokens = text.split(/(<br\s*\/?>)/i);
    tagline.innerHTML = tokens.map(token => /^<br/i.test(token)
      ? token
      : token.split(/(\s+)/).map(word => word.trim() ? `<span>${word}</span>` : word).join("")
    ).join("");
    const words = $$("span", tagline);
    if ("IntersectionObserver" in window) {
      const wordObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-lit");
          wordObserver.unobserve(entry.target);
        }
      }), { threshold: .6, rootMargin: "0px 0px -15% 0px" });
      words.forEach((word, index) => {
        word.style.transitionDelay = `${Math.min(index * 45, 400)}ms`;
        wordObserver.observe(word);
      });
    } else words.forEach(word => word.classList.add("is-lit"));
  }
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach(item => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }), { threshold: .12, rootMargin: "0px 0px -30px 0px" });
  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min((index % 4) * 70, 210)}ms`;
    observer.observe(item);
  });
}

function initScrollSpy() {
  if (!("IntersectionObserver" in window)) return;
  const sections = $$("main section[id]");
  const links = $$(".primary-nav a[href^='#']");
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`));
    });
  }, { rootMargin: "-25% 0px -65% 0px", threshold: 0 });
  sections.forEach(section => observer.observe(section));
}

function initEvents() {
  document.addEventListener("click", event => {
    const target = event.target;
    const serviceButton = target.closest("[data-toggle-service]");
    const packageButton = target.closest("[data-select-package]");
    const suggestionButton = target.closest("[data-activate-suggested]");
    const addFoundation = target.closest("[data-add-foundation]");
    if (serviceButton) toggleService(serviceButton.dataset.toggleService);
    if (packageButton) choosePackage(packageButton.dataset.selectPackage);
    if (suggestionButton) choosePackage(suggestionButton.dataset.activateSuggested);
    if (addFoundation) {
      event.preventDefault();
      if (!state.services.includes("srv-1")) state.services.push("srv-1");
      saveBuilder();
      renderAll();
      $("#services").scrollIntoView({ behavior: "smooth" });
    }
    if (target.closest("[data-apply-promo]")) applyPromo($("#estimate-promo"), $("[data-estimate-promo-feedback]"));
    if (target.closest("[data-apply-booking-promo]")) applyPromo($("#booking-promo"), $("[data-booking-promo-feedback]"));
    if (target.closest("[data-open-estimate]") || target.closest("[data-scroll-estimate]")) {
      if (window.matchMedia("(max-width: 800px)").matches) {
        $(".estimate-panel").classList.add("is-open");
        $("body").classList.add("sheet-open");
      } else $("#estimate").scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (target.closest("[data-close-estimate]")) {
      $(".estimate-panel").classList.remove("is-open");
      $("body").classList.remove("sheet-open");
    }
    if (target.closest("[data-open-privacy]")) openModal("privacy");
    if (target.closest("[data-close-modal]")) closeModal(target.closest("[data-modal]"));
    if (target.classList.contains("modal-backdrop")) closeModal(target);
    const masterButton = target.closest("[data-master]");
    if (masterButton) {
      const masterId = masterButton.dataset.master;
      $("#booking-master").value = masterId;
      renderMasterAdvisory();
      const master = MASTERS[masterId];
      $("#booking").scrollIntoView({ behavior: "smooth" });
      $("#booking-form").classList.add("is-highlighted");
      window.setTimeout(() => $("#booking-form").classList.remove("is-highlighted"), 1200);
      showToast(`Выбран мастер: ${master.name} · ${master.box} — подтвердите дату заезда`);
    }
    const dateButton = target.closest("[data-date]");
    if (dateButton && !dateButton.disabled) {
      state.selectedDate = dateButton.dataset.date;
      state.selectedSlot = null;
      state.ownBlockedDate = null;
      $$("[data-date]").forEach(button => button.setAttribute("aria-pressed", String(button === dateButton)));
      renderSlots();
    }
    const slotButton = target.closest("[data-slot]");
    if (slotButton && !slotButton.disabled) {
      state.selectedSlot = slotButton.dataset.slot;
      state.ownBlockedDate = getHours() > 4 ? state.selectedDate : null;
      renderSlots();
    }
    const shareButton = target.closest("[data-share]");
    if (shareButton && !shareButton.disabled) shareEstimate(shareButton.dataset.share);
    if (target.closest("[data-reset-booking]")) {
      const form = $("#booking-form");
      form.reset();
      form.hidden = false;
      $("[data-booking-success]").hidden = true;
      state.selectedDate = null;
      state.selectedSlot = null;
      state.ownBlockedDate = null;
      state.promo = null;
      $("#estimate-promo").value = "";
      $("#booking-promo").value = "";
      $("[data-estimate-promo-feedback]").textContent = "";
      $("[data-booking-promo-feedback]").textContent = "";
      generateDates();
      renderAll();
      $("#booking").scrollIntoView({ behavior: "smooth" });
    }
    if (target.closest(".primary-nav a")) closeMenu();
  });

  $$('input[name="car-class"]').forEach(radio => radio.addEventListener("change", () => {
    state.carClass = radio.value;
    saveBuilder();
    renderAll();
  }));
  $("#booking-master").addEventListener("change", renderMasterAdvisory);
  $("#personal-consent").addEventListener("change", updateSubmitState);
  $$('input[name="confirmMethod"]').forEach(input => input.addEventListener("change", updateSubmitState));
  $("#booking-form").addEventListener("submit", submitBooking);
  $("#customer-phone").addEventListener("input", event => {
    const input = event.currentTarget;
    let digits = input.value.replace(/\D/g, "");
    if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
    if (digits.startsWith("7")) digits = digits.slice(1);
    input.value = formatPhone(digits);
  });
  $("#booking-promo").addEventListener("input", () => {
    state.promo = null;
    $("[data-booking-promo-feedback]").textContent = "";
    $("[data-estimate-promo-feedback]").textContent = "";
    renderEstimate();
  });
  $("#estimate-promo").addEventListener("input", () => {
    state.promo = null;
    $("[data-estimate-promo-feedback]").textContent = "";
    $("[data-booking-promo-feedback]").textContent = "";
    renderEstimate();
  });
  $(".menu-toggle").addEventListener("click", event => {
    const button = event.currentTarget;
    const isOpen = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isOpen));
    button.setAttribute("aria-label", isOpen ? "Открыть меню" : "Закрыть меню");
    $("#primary-nav").classList.toggle("is-open", !isOpen);
    $("body").classList.toggle("menu-open", !isOpen);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      $$("[data-modal]:not([hidden])").forEach(closeModal);
      closeMenu();
      $(".estimate-panel")?.classList.remove("is-open");
      $("body").classList.remove("sheet-open");
    }
  });
  $$(".faq-item").forEach(item => item.addEventListener("toggle", () => {
    if (item.open) $$(".faq-item").filter(other => other !== item).forEach(other => { other.open = false; });
  }));
}

function runPricingChecks() {
  const original = { ...state };
  const scenarios = [
    { name: "A", carClass: "class2", services: ["srv-2"], package: null, promo: null, expected: 45000 },
    { name: "B", carClass: "class1", services: ["srv-5", "srv-6"], package: null, promo: "APEX10", expected: 10327 },
    { name: "C", carClass: "class1", services: ["srv-1", "srv-2", "srv-5"], package: "pkg-1", promo: "APEX10", expected: 52110 },
    { name: "D", carClass: "class1", services: ["srv-1", "srv-2", "srv-5", "srv-6"], package: "pkg-1", promo: "APEX10", expected: 57510 },
    { name: "E", carClass: "class1", services: ["srv-1", "srv-2", "srv-5"], package: null, promo: null, expected: 59075 }
  ];
  scenarios.forEach(test => {
    state.carClass = test.carClass;
    state.services = test.services;
    state.package = test.package;
    state.promo = test.promo;
    const actual = calculate().total;
    console.assert(actual === test.expected, `Pricing scenario ${test.name}: expected ${test.expected}, received ${actual}`);
  });
  Object.assign(state, original);
}

function init() {
  restoreBuilder();
  generateDates();
  initComparison();
  initReveals();
  initScrollSpy();
  initEvents();
  renderAll();
  runPricingChecks();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
