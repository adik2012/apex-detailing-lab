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
    "pkg-1": { name: "Керамическое зеркало", services: ["srv-1", "srv-2", "srv-5"], price: { class1: 54500, class2: 65000, class3: 80000 } },
    "pkg-2": { name: "Броня трассы PPF", services: ["srv-3", "srv-5"], price: { class1: 80000, class2: 97000, class3: 118000 } },
    "pkg-3": { name: "Полная перезагрузка", services: ["srv-1", "srv-2", "srv-4", "srv-6"], price: { class1: 67500, class2: 81000, class3: 100000 } }
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
  sending: false,
  submitted: false
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const formatPrice = amount => `${new Intl.NumberFormat("ru-RU").format(amount)} ₽`;
const moscowDateParts = date => Object.fromEntries(new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit"
}).formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
const dateISO = date => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const slots = ["10:00", "12:00", "14:00", "16:00", "18:00"];
const busySlots = new Set(["1:12:00", "3:10:00", "5:18:00", "8:14:00"]);
let modalReturnFocus = null;
let estimateReturnFocus = null;

function getHours() {
  return state.services.reduce((sum, id) => sum + PRICING.services[id].hours[state.carClass], 0);
}

function computeTotals({ carClass, services, package: pkgId = null, promo = null }) {
  const packageData = pkgId ? PRICING.packages[pkgId] : null;
  const extras = packageData ? services.filter(id => !packageData.services.includes(id)) : [...services];
  const serviceTotal = services.reduce((sum, id) => sum + PRICING.services[id].price[carClass], 0);
  const base = (packageData ? packageData.price[carClass] : 0) +
    extras.reduce((sum, id) => sum + PRICING.services[id].price[carClass], 0);
  const comboBase = packageData
    ? extras.reduce((sum, id) => sum + PRICING.services[id].price[carClass], 0)
    : serviceTotal;
  const combo = (packageData ? extras.length : services.length) >= PRICING.rules.comboMinServices
    ? Math.round(comboBase * PRICING.rules.comboDiscount)
    : 0;
  const amount = base - combo;
  const promoDiscount = promo === PRICING.rules.promo.code
    ? Math.round(amount * PRICING.rules.promo.discount)
    : 0;
  const total = amount - promoDiscount;
  const hours = services.reduce((sum, id) => sum + PRICING.services[id].hours[carClass], 0);
  const packageSavings = packageData
    ? packageData.services.reduce((sum, id) => sum + PRICING.services[id].price[carClass], 0) - packageData.price[carClass]
    : 0;
  return {
    base,
    combo,
    promo: promoDiscount,
    total,
    hours,
    gift: total >= PRICING.rules.giftThreshold,
    extras,
    packageSavings,
    serviceTotal
  };
}

function calculate() {
  return computeTotals(state);
}

function getPickupDateTime(date, slot, hours) {
  const [year, month, day] = date.split("-").map(Number);
  let dateTime = new Date(Date.UTC(year, month - 1, day, Number(slot.slice(0, 2))));
  let remainingHours = hours;
  while (remainingHours > 0) {
    const availableHours = 20 - dateTime.getUTCHours();
    const workedHours = Math.min(remainingHours, availableHours);
    dateTime = new Date(dateTime.getTime() + workedHours * 60 * 60 * 1000);
    remainingHours -= workedHours;
    if (remainingHours > 0) {
      dateTime.setUTCDate(dateTime.getUTCDate() + 1);
      dateTime.setUTCHours(10, 0, 0, 0);
    }
  }
  return dateTime;
}

function formatPickup(dateTime) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC", weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
  }).formatToParts(dateTime).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${parts.weekday}, ${parts.day}.${parts.month}, около ${parts.hour}:${parts.minute}`;
}

function isSlotAvailable(offset, slot, hours) {
  const startHour = Number(slot.slice(0, 2));
  const outsideWorkHours = startHour < 10 || startHour > 18;
  const cannotFinishToday = hours <= PRICING.rules.workdayHours && startHour + hours > 20;
  if (hours <= 0 || outsideWorkHours || cannotFinishToday) return false;

  let remainingHours = hours;
  let workdayOffset = offset;
  let workdayStart = startHour;
  while (remainingHours > 0) {
    const workdayEnd = Math.min(20, workdayStart + remainingHours);
    for (const busySlot of busySlots) {
      const [busyOffset, busyTime] = busySlot.split(":");
      const busyHour = Number(busyTime.slice(0, 2));
      if (Number(busyOffset) === workdayOffset && busyHour >= workdayStart && busyHour < workdayEnd) return false;
    }
    remainingHours -= workdayEnd - workdayStart;
    if (remainingHours > 0) {
      workdayOffset += 1;
      workdayStart = 10;
    }
  }
  return true;
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
    const manualCombo = packageData.services.length >= PRICING.rules.comboMinServices
      ? Math.round(includedTotal * PRICING.rules.comboDiscount)
      : 0;
    const comboSavings = Math.max(0, includedTotal - manualCombo - price);
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
    if (benefitElement) benefitElement.textContent = `${formatPrice(includedTotal - price)} / ${formatPrice(comboSavings)}`;
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
  for (const [id, item] of Object.entries(PRICING.packages)) {
    if (!item.services.every(serviceId => state.services.includes(serviceId))) continue;
    const manualTotal = computeTotals({ carClass: state.carClass, services: state.services, promo: state.promo }).total;
    const packageTotal = computeTotals({ carClass: state.carClass, services: state.services, package: id, promo: state.promo }).total;
    const savings = manualTotal - packageTotal;
    if (savings >= 500) return [id, item, savings];
  }
  return null;
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
      const [, , benefit] = suggestion;
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
  const pickup = state.selectedDate && state.selectedSlot
    ? `Выдача: ${formatPickup(getPickupDateTime(state.selectedDate, state.selectedSlot, result.hours))}`
    : "";
  node.innerHTML = `<div class="form-summary-content"><p>${escapeHTML(PRICING.classes[state.carClass].label)}</p><p>${selectedLabel}</p>${discountRows}<div class="form-summary-total"><span>Итого</span><strong>${formatPrice(result.total)}</strong></div><p>Длительность: ${result.hours} ч</p>${pickup ? `<p>${escapeHTML(pickup)}</p>` : ""}</div>`;
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
  const previousPackage = state.package ? PRICING.packages[state.package] : null;
  const manualServices = previousPackage
    ? state.services.filter(id => !previousPackage.services.includes(id))
    : [...state.services];
  if (state.package === packageId) {
    state.package = null;
    state.services = manualServices;
  } else {
    state.package = packageId;
    state.services = [...new Set([...manualServices, ...PRICING.packages[packageId].services])];
  }
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
  const todayParts = moscowDateParts(new Date());
  const today = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day));
  const shortDays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const dates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + index + 1);
    return date;
  });
  container.innerHTML = dates.map((date, index) => {
    const id = dateISO(date);
    const display = `${shortDays[date.getUTCDay()]}, ${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return `<button type="button" class="date-chip" data-date="${id}" aria-pressed="false"><strong>${index === 0 ? "Завтра" : display}</strong><small>${index === 0 ? display : "Свободная дата"}</small></button>`;
  }).join("");
}

function getDateOffset(isoDate) {
  if (!isoDate) return -1;
  const todayParts = moscowDateParts(new Date());
  const today = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);
  const [year, month, day] = isoDate.split("-").map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - today) / 86400000);
}

function renderSlots() {
  const container = $("[data-slot-picker]");
  const message = $("[data-slot-message]");
  const estimate = $("[data-booking-estimate]");
  if (!container) return;
  const offset = getDateOffset(state.selectedDate);
  const hours = getHours();
  if (state.selectedSlot && !isSlotAvailable(offset, state.selectedSlot, hours)) {
    state.selectedSlot = null;
    state.ownBlockedDate = null;
  }
  const occupancyDays = state.ownBlockedDate === state.selectedDate && hours > 4;
  container.innerHTML = slots.map(slot => {
    const available = isSlotAvailable(offset, slot, hours);
    const busy = busySlots.has(`${offset}:${slot}`);
    const occupiedByVisit = occupancyDays && state.selectedSlot !== slot;
    const disabled = !state.selectedDate || !available || occupiedByVisit;
    const title = busy ? "На этот слот уже стоит авто" : occupiedByVisit ? "Занято вашим визитом" : !available ? "Слот недоступен с учетом длительности работ" : "";
    const pressed = state.selectedSlot === slot && !disabled;
    const status = busy ? "Занято" : occupiedByVisit ? "Ваш визит" : !available ? "Недоступно" : "";
    return `<button class="slot-chip" type="button" data-slot="${slot}" aria-pressed="${pressed}" ${disabled ? "disabled" : ""} ${title ? `title="${title}" aria-label="${slot}: ${title}"` : ""}>${slot}${status ? `<small>${status}</small>` : ""}</button>`;
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
  if (state.selectedDate && state.selectedSlot && hours > 0) {
    const pickup = getPickupDateTime(state.selectedDate, state.selectedSlot, hours);
    const multiday = dateISO(pickup) !== state.selectedDate;
    const taxi = hours >= 8 || multiday
      ? "<strong>Подменное такси бизнес-класса — за наш счет</strong>: отвезем вас домой после заезда и вернем на выдачу."
      : "";
    estimate.hidden = false;
    estimate.innerHTML = `Длительность работ: <strong>${hours} ч</strong>. Автомобиль остается в боксе под видеонаблюдением. ${taxi ? `${taxi} ` : ""}Выдача: <strong>${escapeHTML(formatPickup(pickup))}</strong>.`;
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
    submit.disabled = !consent || !hasSelection || state.sending || state.submitted;
    const method = $('input[name="confirmMethod"]:checked', form)?.value || "onsite";
    const label = $("[data-submit-label]", submit);
    if (label) {
      label.textContent = method === "sbp" ? "Показать QR СБП" : method === "messenger" ? "Отправить расчет в Telegram / WhatsApp" : "Подтвердить запись";
    }
  }
  $$("[data-share]", form).forEach(button => { button.disabled = !consent || !hasSelection || state.sending || state.submitted; });
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
  const fieldErrors = {};
  const name = $("#customer-name", form).value.trim();
  const carModel = $("#car-model", form).value.trim();
  const phoneDigits = $("#customer-phone", form).value.replace(/\D/g, "");
  const phone = phoneDigits.length === 11 && phoneDigits.startsWith("7") ? `+${phoneDigits}` : "";
  if (!state.services.length) errors.push("Сначала соберите комплекс из услуг.");
  if (name.length < 2 || name.length > 40 || !/^[\p{L}\s-]+$/u.test(name)) {
    fieldErrors["customer-name"] = "Имя должно содержать от 2 до 40 букв.";
    errors.push(fieldErrors["customer-name"]);
  }
  if (!carModel || carModel.length > 60) {
    fieldErrors["car-model"] = "Укажите марку и модель автомобиля (до 60 символов).";
    errors.push(fieldErrors["car-model"]);
  }
  if (!/^\+7[3489]\d{9}$/.test(phone)) {
    fieldErrors["customer-phone"] = "Введите полный номер: +7 и 10 цифр, номер должен начинаться с 3, 4, 8 или 9.";
    errors.push(fieldErrors["customer-phone"]);
  }
  if (!state.selectedDate) {
    fieldErrors["date-picker"] = "Выберите дату заезда.";
    errors.push(fieldErrors["date-picker"]);
  }
  if (!state.selectedSlot) {
    fieldErrors["slot-picker"] = "Выберите свободное время заезда.";
    errors.push(fieldErrors["slot-picker"]);
  }
  if (!$("#personal-consent", form).checked) {
    fieldErrors["personal-consent"] = "Необходимо согласие на обработку персональных данных.";
    errors.push(fieldErrors["personal-consent"]);
  }
  return { errors, fieldErrors, phone, name, carModel };
}

function updateFieldErrors(form, fieldErrors) {
  const fields = {
    "customer-name": $("#customer-name", form),
    "car-model": $("#car-model", form),
    "customer-phone": $("#customer-phone", form),
    "personal-consent": $("#personal-consent", form),
    "date-picker": $("[data-date-picker]", form),
    "slot-picker": $("[data-slot-picker]", form)
  };
  Object.entries(fields).forEach(([id, field]) => {
    if (!field) return;
    const error = $(`#${id}-error`, form);
    const describedBy = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(value => value && value !== `${id}-error`);
    if (fieldErrors[id]) {
      field.setAttribute("aria-invalid", "true");
      describedBy.push(`${id}-error`);
    } else {
      field.removeAttribute("aria-invalid");
    }
    if (describedBy.length) field.setAttribute("aria-describedby", describedBy.join(" "));
    else field.removeAttribute("aria-describedby");
    if (error) {
      error.textContent = fieldErrors[id] || "";
      error.hidden = !fieldErrors[id];
    }
  });
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

function showSuccess(orderId, payload, isDemo, serverPickup = null) {
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
    const totals = computeTotals({ carClass: payload.carClass, services: payload.services, package: payload.package, promo: payload.promo });
    const pickup = serverPickup || formatPickup(getPickupDateTime(payload.date, payload.slot, totals.hours));
    summary.innerHTML = `<div class="form-summary-content"><p>${escapeHTML(PRICING.classes[payload.carClass].label)}</p><p>${payload.services.map(id => escapeHTML(PACKAGE_COMPONENT_NAMES[id])).join(", ")}</p><p>${escapeHTML(payload.date)} · ${escapeHTML(payload.slot)} · ${escapeHTML(masterText)}</p><p>Выдача: ${escapeHTML(pickup)}</p><div class="form-summary-total"><span>Итого</span><strong>${formatPrice(totals.total)}</strong></div></div>${isDemo ? '<p class="demo-note">Статичный хостинг портфолио: заявка не отправляется на сервер.</p>' : ""}`;
  }
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function submitBooking(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorBox = $("[data-form-errors]", form);
  const validation = validateForm(form);
  updateFieldErrors(form, validation.fieldErrors);
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
      state.submitted = true;
      updateSubmitState();
      $$("input, select, textarea, button", form).forEach(field => { field.disabled = true; });
      if (payload.confirmMethod === "sbp") openModal("sbp");
      return;
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    let response;
    let responseText;
    try {
      response = await fetch("send.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      responseText = await response.text();
    } finally {
      window.clearTimeout(timeoutId);
    }
    let responseData = null;
    try { responseData = JSON.parse(responseText); } catch { responseData = null; }
    if (!response.ok || !responseData || responseData.ok !== true || typeof responseData.orderId !== "string") {
      const errorCode = responseData?.error?.code;
      const messages = {
        unknown_class: "Выберите класс автомобиля из списка.",
        unknown_service: "В составе комплекса найдена неизвестная услуга.",
        bad_promo: "Промокод не найден. Проверьте написание.",
        no_consent: "Необходимо согласие на обработку персональных данных.",
        slot_unavailable: "Выбранный слот уже занят. Выберите другую дату или время.",
        rate_limited: "Слишком много заявок. Попробуйте позже или позвоните: +7 (900) 000-00-00.",
        validation: "Проверьте данные заявки, выбранную дату и время.",
        server: "Не удалось сохранить заявку. Позвоните нам: +7 (900) 000-00-00."
      };
      const statusMessages = {
        400: "Не удалось прочитать заявку. Проверьте данные и повторите отправку.",
        413: "Заявка слишком большая. Проверьте данные и повторите отправку.",
        415: "Сервер отклонил формат заявки. Позвоните нам: +7 (900) 000-00-00.",
        422: "Проверьте данные заявки и выберите доступный слот.",
        429: "Слишком много заявок. Попробуйте позже.",
        500: "Не удалось сохранить заявку. Позвоните нам: +7 (900) 000-00-00."
      };
      throw new Error(messages[errorCode] || statusMessages[response.status] || BOOKING_API_ERROR);
    }
    showSuccess(responseData.orderId, payload, false, responseData.summary?.pickup);
    state.submitted = true;
    updateSubmitState();
    $$("input, select, textarea, button", form).forEach(field => { field.disabled = true; });
    if (payload.confirmMethod === "sbp") openModal("sbp");
  } catch (error) {
    console.error("Не удалось отправить заявку.", error);
    errorBox.textContent = error.name === "AbortError"
      ? "Сервер не ответил за 15 секунд. Проверьте соединение и повторите отправку."
      : error.message === BOOKING_API_ERROR || error.message.startsWith("Выберите") || error.message.startsWith("В составе") || error.message.startsWith("Промокод") || error.message.startsWith("Необходимо") || error.message.startsWith("Слишком") || error.message.startsWith("Проверьте") || error.message.startsWith("Не удалось")
        ? error.message
        : BOOKING_API_ERROR;
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
  modalReturnFocus = document.activeElement;
  modal.hidden = false;
  $("body").classList.add("modal-open");
  $("[data-close-modal]", modal)?.focus();
}

function closeModal(modal) {
  if (modal) modal.hidden = true;
  if (!$("[data-modal]:not([hidden])")) $("body").classList.remove("modal-open");
  if (modalReturnFocus?.isConnected && !modalReturnFocus.disabled) modalReturnFocus.focus();
  else $("[data-success-title]")?.focus();
  modalReturnFocus = null;
}

function openEstimateSheet(trigger) {
  const panel = $(".estimate-panel");
  if (!panel) return;
  estimateReturnFocus = trigger;
  panel.classList.add("is-open");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-hidden", "false");
  $$("[data-open-estimate], [data-scroll-estimate]").forEach(button => button.setAttribute("aria-expanded", "true"));
  $("body").classList.add("sheet-open");
  $(".estimate-close", panel)?.focus();
}

function closeEstimateSheet() {
  const panel = $(".estimate-panel");
  if (!panel?.classList.contains("is-open")) return;
  panel.classList.remove("is-open");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-hidden", "true");
  $$("[data-open-estimate], [data-scroll-estimate]").forEach(button => button.setAttribute("aria-expanded", "false"));
  $("body").classList.remove("sheet-open");
  if (estimateReturnFocus?.isConnected) estimateReturnFocus.focus();
  estimateReturnFocus = null;
}

function trapFocus(container, event) {
  if (event.key !== "Tab") return;
  const focusable = $$('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])', container)
    .filter(element => !element.hidden && element.getClientRects().length > 0);
  if (!focusable.length) {
    event.preventDefault();
    container.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
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
        openEstimateSheet(target.closest("[data-open-estimate], [data-scroll-estimate]"));
      } else $("#estimate").scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (target.closest("[data-close-estimate]")) {
      closeEstimateSheet();
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
      state.submitted = false;
      $$("input, select, textarea, button", form).forEach(field => { field.disabled = false; });
      updateFieldErrors(form, {});
      $("[data-form-errors]", form).textContent = "";
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
    const modal = $("[data-modal]:not([hidden])");
    if (modal) {
      if (event.key === "Escape") {
        closeModal(modal);
        return;
      }
      trapFocus(modal, event);
      return;
    }
    const estimate = $(".estimate-panel.is-open");
    if (estimate) {
      if (event.key === "Escape") {
        closeEstimateSheet();
        return;
      }
      trapFocus(estimate, event);
      return;
    }
    if (event.key === "Escape") {
      closeMenu();
    }
  });
  $$(".faq-item").forEach(item => item.addEventListener("toggle", () => {
    if (item.open) $$(".faq-item").filter(other => other !== item).forEach(other => { other.open = false; });
  }));
}

function init() {
  restoreBuilder();
  if (window.matchMedia("(max-width: 800px)").matches) $(".estimate-panel")?.setAttribute("aria-hidden", "true");
  generateDates();
  initComparison();
  initReveals();
  initScrollSpy();
  initEvents();
  renderAll();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
