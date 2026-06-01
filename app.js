(function () {
  "use strict";

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const DB_NAME = "country-days-db";

  const COUNTRIES = [
    "Afghanistan",
    "Albania",
    "Algeria",
    "Andorra",
    "Angola",
    "Antigua and Barbuda",
    "Argentina",
    "Armenia",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahamas",
    "Bahrain",
    "Bangladesh",
    "Barbados",
    "Belarus",
    "Belgium",
    "Belize",
    "Benin",
    "Bhutan",
    "Bolivia",
    "Bosnia and Herzegovina",
    "Botswana",
    "Brazil",
    "Brunei",
    "Bulgaria",
    "Burkina Faso",
    "Burundi",
    "Cabo Verde",
    "Cambodia",
    "Cameroon",
    "Canada",
    "Central African Republic",
    "Chad",
    "Chile",
    "China",
    "Colombia",
    "Comoros",
    "Congo",
    "Costa Rica",
    "Cote d'Ivoire",
    "Croatia",
    "Cuba",
    "Cyprus",
    "Czechia",
    "Democratic Republic of the Congo",
    "Denmark",
    "Djibouti",
    "Dominica",
    "Dominican Republic",
    "Ecuador",
    "Egypt",
    "El Salvador",
    "Equatorial Guinea",
    "Eritrea",
    "Estonia",
    "Eswatini",
    "Ethiopia",
    "Fiji",
    "Finland",
    "France",
    "Gabon",
    "Gambia",
    "Georgia",
    "Germany",
    "Ghana",
    "Greece",
    "Grenada",
    "Guatemala",
    "Guinea",
    "Guinea-Bissau",
    "Guyana",
    "Haiti",
    "Holy See",
    "Honduras",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Ireland",
    "Israel",
    "Italy",
    "Jamaica",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kenya",
    "Kiribati",
    "Kosovo",
    "Kuwait",
    "Kyrgyzstan",
    "Laos",
    "Latvia",
    "Lebanon",
    "Lesotho",
    "Liberia",
    "Libya",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Madagascar",
    "Malawi",
    "Malaysia",
    "Maldives",
    "Mali",
    "Malta",
    "Marshall Islands",
    "Mauritania",
    "Mauritius",
    "Mexico",
    "Micronesia",
    "Moldova",
    "Monaco",
    "Mongolia",
    "Montenegro",
    "Morocco",
    "Mozambique",
    "Myanmar",
    "Namibia",
    "Nauru",
    "Nepal",
    "Netherlands",
    "New Zealand",
    "Nicaragua",
    "Niger",
    "Nigeria",
    "North Korea",
    "North Macedonia",
    "Norway",
    "Oman",
    "Pakistan",
    "Palau",
    "Palestine",
    "Panama",
    "Papua New Guinea",
    "Paraguay",
    "Peru",
    "Philippines",
    "Poland",
    "Portugal",
    "Qatar",
    "Romania",
    "Russia",
    "Rwanda",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and the Grenadines",
    "Samoa",
    "San Marino",
    "Sao Tome and Principe",
    "Saudi Arabia",
    "Senegal",
    "Serbia",
    "Seychelles",
    "Sierra Leone",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "Solomon Islands",
    "Somalia",
    "South Africa",
    "South Korea",
    "South Sudan",
    "Spain",
    "Sri Lanka",
    "Sudan",
    "Suriname",
    "Sweden",
    "Switzerland",
    "Syria",
    "Taiwan",
    "Tajikistan",
    "Tanzania",
    "Thailand",
    "Timor-Leste",
    "Togo",
    "Tonga",
    "Trinidad and Tobago",
    "Tunisia",
    "Turkey",
    "Turkmenistan",
    "Tuvalu",
    "Uganda",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "Uruguay",
    "Uzbekistan",
    "Vanuatu",
    "Venezuela",
    "Vietnam",
    "Yemen",
    "Zambia",
    "Zimbabwe"
  ];

  const TERRITORIES = [
    "Aland Islands",
    "American Samoa",
    "Anguilla",
    "Antarctica",
    "Aruba",
    "Bermuda",
    "Bonaire, Sint Eustatius and Saba",
    "Bouvet Island",
    "British Indian Ocean Territory",
    "British Virgin Islands",
    "Cayman Islands",
    "Christmas Island",
    "Cocos (Keeling) Islands",
    "Cook Islands",
    "Curacao",
    "Falkland Islands",
    "Faroe Islands",
    "French Guiana",
    "French Polynesia",
    "French Southern Territories",
    "Gibraltar",
    "Greenland",
    "Guadeloupe",
    "Guam",
    "Guernsey",
    "Heard Island and McDonald Islands",
    "Hong Kong",
    "Isle of Man",
    "Jersey",
    "Macao",
    "Martinique",
    "Mayotte",
    "Montserrat",
    "New Caledonia",
    "Niue",
    "Norfolk Island",
    "Northern Mariana Islands",
    "Pitcairn",
    "Puerto Rico",
    "Reunion",
    "Saint Barthelemy",
    "Saint Helena",
    "Saint Martin",
    "Saint Pierre and Miquelon",
    "Sint Maarten",
    "South Georgia and the South Sandwich Islands",
    "Svalbard and Jan Mayen",
    "Tokelau",
    "Turks and Caicos Islands",
    "U.S. Outlying Islands",
    "U.S. Virgin Islands",
    "Wallis and Futuna",
    "Western Sahara"
  ];

  const PLACES = [...COUNTRIES, ...TERRITORIES].sort((a, b) => a.localeCompare(b));

  const COUNTRY_CODES = {
    "afghanistan": "AF",
    "albania": "AL",
    "algeria": "DZ",
    "andorra": "AD",
    "angola": "AO",
    "antigua and barbuda": "AG",
    "argentina": "AR",
    "armenia": "AM",
    "australia": "AU",
    "austria": "AT",
    "azerbaijan": "AZ",
    "bahamas": "BS",
    "bahrain": "BH",
    "bangladesh": "BD",
    "barbados": "BB",
    "belarus": "BY",
    "belgium": "BE",
    "belize": "BZ",
    "benin": "BJ",
    "bhutan": "BT",
    "bolivia": "BO",
    "bosnia and herzegovina": "BA",
    "botswana": "BW",
    "brazil": "BR",
    "brunei": "BN",
    "bulgaria": "BG",
    "burkina faso": "BF",
    "burundi": "BI",
    "cabo verde": "CV",
    "cambodia": "KH",
    "cameroon": "CM",
    "canada": "CA",
    "central african republic": "CF",
    "chad": "TD",
    "chile": "CL",
    "china": "CN",
    "colombia": "CO",
    "comoros": "KM",
    "congo": "CG",
    "costa rica": "CR",
    "cote d'ivoire": "CI",
    "croatia": "HR",
    "cuba": "CU",
    "cyprus": "CY",
    "czechia": "CZ",
    "democratic republic of the congo": "CD",
    "denmark": "DK",
    "djibouti": "DJ",
    "dominica": "DM",
    "dominican republic": "DO",
    "ecuador": "EC",
    "egypt": "EG",
    "el salvador": "SV",
    "equatorial guinea": "GQ",
    "eritrea": "ER",
    "estonia": "EE",
    "eswatini": "SZ",
    "ethiopia": "ET",
    "fiji": "FJ",
    "finland": "FI",
    "france": "FR",
    "gabon": "GA",
    "gambia": "GM",
    "georgia": "GE",
    "germany": "DE",
    "ghana": "GH",
    "greece": "GR",
    "grenada": "GD",
    "guatemala": "GT",
    "guinea": "GN",
    "guinea-bissau": "GW",
    "guyana": "GY",
    "haiti": "HT",
    "holy see": "VA",
    "honduras": "HN",
    "hungary": "HU",
    "iceland": "IS",
    "india": "IN",
    "indonesia": "ID",
    "iran": "IR",
    "iraq": "IQ",
    "ireland": "IE",
    "israel": "IL",
    "italy": "IT",
    "jamaica": "JM",
    "japan": "JP",
    "jordan": "JO",
    "kazakhstan": "KZ",
    "kenya": "KE",
    "kiribati": "KI",
    "kosovo": "XK",
    "kuwait": "KW",
    "kyrgyzstan": "KG",
    "laos": "LA",
    "latvia": "LV",
    "lebanon": "LB",
    "lesotho": "LS",
    "liberia": "LR",
    "libya": "LY",
    "liechtenstein": "LI",
    "lithuania": "LT",
    "luxembourg": "LU",
    "madagascar": "MG",
    "malawi": "MW",
    "malaysia": "MY",
    "maldives": "MV",
    "mali": "ML",
    "malta": "MT",
    "marshall islands": "MH",
    "mauritania": "MR",
    "mauritius": "MU",
    "mexico": "MX",
    "micronesia": "FM",
    "moldova": "MD",
    "monaco": "MC",
    "mongolia": "MN",
    "montenegro": "ME",
    "morocco": "MA",
    "mozambique": "MZ",
    "myanmar": "MM",
    "namibia": "NA",
    "nauru": "NR",
    "nepal": "NP",
    "netherlands": "NL",
    "new zealand": "NZ",
    "nicaragua": "NI",
    "niger": "NE",
    "nigeria": "NG",
    "north korea": "KP",
    "north macedonia": "MK",
    "norway": "NO",
    "oman": "OM",
    "pakistan": "PK",
    "palau": "PW",
    "palestine": "PS",
    "panama": "PA",
    "papua new guinea": "PG",
    "paraguay": "PY",
    "peru": "PE",
    "philippines": "PH",
    "poland": "PL",
    "portugal": "PT",
    "qatar": "QA",
    "romania": "RO",
    "russia": "RU",
    "rwanda": "RW",
    "saint kitts and nevis": "KN",
    "saint lucia": "LC",
    "saint vincent and the grenadines": "VC",
    "samoa": "WS",
    "san marino": "SM",
    "sao tome and principe": "ST",
    "saudi arabia": "SA",
    "senegal": "SN",
    "serbia": "RS",
    "seychelles": "SC",
    "sierra leone": "SL",
    "singapore": "SG",
    "slovakia": "SK",
    "slovenia": "SI",
    "solomon islands": "SB",
    "somalia": "SO",
    "south africa": "ZA",
    "south korea": "KR",
    "south sudan": "SS",
    "spain": "ES",
    "sri lanka": "LK",
    "sudan": "SD",
    "suriname": "SR",
    "sweden": "SE",
    "switzerland": "CH",
    "syria": "SY",
    "taiwan": "TW",
    "tajikistan": "TJ",
    "tanzania": "TZ",
    "thailand": "TH",
    "timor-leste": "TL",
    "togo": "TG",
    "tonga": "TO",
    "trinidad and tobago": "TT",
    "tunisia": "TN",
    "turkey": "TR",
    "turkmenistan": "TM",
    "tuvalu": "TV",
    "uganda": "UG",
    "ukraine": "UA",
    "united arab emirates": "AE",
    "united kingdom": "GB",
    "united states": "US",
    "uruguay": "UY",
    "uzbekistan": "UZ",
    "vanuatu": "VU",
    "venezuela": "VE",
    "vietnam": "VN",
    "yemen": "YE",
    "zambia": "ZM",
    "zimbabwe": "ZW"
  };

  const TERRITORY_CODES = {
    "aland islands": "AX",
    "american samoa": "AS",
    "anguilla": "AI",
    "antarctica": "AQ",
    "aruba": "AW",
    "bermuda": "BM",
    "bonaire, sint eustatius and saba": "BQ",
    "bouvet island": "BV",
    "british indian ocean territory": "IO",
    "british virgin islands": "VG",
    "cayman islands": "KY",
    "christmas island": "CX",
    "cocos (keeling) islands": "CC",
    "cook islands": "CK",
    "curacao": "CW",
    "falkland islands": "FK",
    "faroe islands": "FO",
    "french guiana": "GF",
    "french polynesia": "PF",
    "french southern territories": "TF",
    "gibraltar": "GI",
    "greenland": "GL",
    "guadeloupe": "GP",
    "guam": "GU",
    "guernsey": "GG",
    "heard island and mcdonald islands": "HM",
    "hong kong": "HK",
    "isle of man": "IM",
    "jersey": "JE",
    "macao": "MO",
    "martinique": "MQ",
    "mayotte": "YT",
    "montserrat": "MS",
    "new caledonia": "NC",
    "niue": "NU",
    "norfolk island": "NF",
    "northern mariana islands": "MP",
    "pitcairn": "PN",
    "puerto rico": "PR",
    "reunion": "RE",
    "saint barthelemy": "BL",
    "saint helena": "SH",
    "saint martin": "MF",
    "saint pierre and miquelon": "PM",
    "sint maarten": "SX",
    "south georgia and the south sandwich islands": "GS",
    "svalbard and jan mayen": "SJ",
    "tokelau": "TK",
    "turks and caicos islands": "TC",
    "u.s. outlying islands": "UM",
    "u.s. virgin islands": "VI",
    "wallis and futuna": "WF",
    "western sahara": "EH"
  };

  const PLACE_CODE_ALIASES = {
    "cape verde": "CV",
    "hong kong sar": "HK",
    "macao sar": "MO",
    "macau": "MO",
    "saint helena, ascension and tristan da cunha": "SH",
    "united states minor outlying islands": "UM",
    "us outlying islands": "UM",
    "us virgin islands": "VI"
  };

  const PLACE_NAME_ALIASES = {
    "cape verde": "Cabo Verde",
    "hong kong sar": "Hong Kong",
    "macao sar": "Macao",
    "macau": "Macao",
    "saint helena, ascension and tristan da cunha": "Saint Helena",
    "united states minor outlying islands": "U.S. Outlying Islands",
    "us outlying islands": "U.S. Outlying Islands",
    "us virgin islands": "U.S. Virgin Islands"
  };

  const PLACE_CODES = {
    ...COUNTRY_CODES,
    ...TERRITORY_CODES,
    ...PLACE_CODE_ALIASES
  };

  const state = {
    stays: [],
    calendarOpen: false,
    calendarMonth: todayIso().slice(0, 7),
    search: "",
    status: "all",
    sort: "newest",
    toastTimer: null
  };

  let db;

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    populateCountryList();
    bindEvents();
    registerServiceWorker();

    if (!window.Dexie) {
      setFormMessage("Dexie could not load. Check your network connection and reload.");
      showToast("Dexie could not load. The app cannot open the database yet.");
      return;
    }

    db = new Dexie(DB_NAME);
    db.version(1).stores({
      stays: "++id,country,startDate,endDate,createdAt,updatedAt"
    });

    try {
      await db.open();
      await loadStays();
    } catch (error) {
      setFormMessage("Could not open IndexedDB in this browser.");
      showToast(error.message || "IndexedDB failed to open.");
    }
  }

  function cacheElements() {
    els.form = document.getElementById("stayForm");
    els.stayId = document.getElementById("stayId");
    els.countryInput = document.getElementById("countryInput");
    els.startDateInput = document.getElementById("startDateInput");
    els.endDateInput = document.getElementById("endDateInput");
    els.notesInput = document.getElementById("notesInput");
    els.formMessage = document.getElementById("formMessage");
    els.formTitle = document.getElementById("formTitle");
    els.submitButton = document.getElementById("submitButton");
    els.cancelEditButton = document.getElementById("cancelEditButton");
    els.countryList = document.getElementById("countryList");
    els.statsGrid = document.getElementById("statsGrid");
    els.calendarToggleButton = document.getElementById("calendarToggleButton");
    els.calendarPanel = document.getElementById("calendarPanel");
    els.calendarGrid = document.getElementById("calendarGrid");
    els.calendarMonthLabel = document.getElementById("calendarMonthLabel");
    els.calendarSummary = document.getElementById("calendarSummary");
    els.prevMonthButton = document.getElementById("prevMonthButton");
    els.todayMonthButton = document.getElementById("todayMonthButton");
    els.nextMonthButton = document.getElementById("nextMonthButton");
    els.countryBreakdown = document.getElementById("countryBreakdown");
    els.yearBreakdown = document.getElementById("yearBreakdown");
    els.tableBody = document.getElementById("staysTableBody");
    els.emptyState = document.getElementById("emptyState");
    els.searchInput = document.getElementById("searchInput");
    els.statusFilter = document.getElementById("statusFilter");
    els.sortSelect = document.getElementById("sortSelect");
    els.importButton = document.getElementById("importButton");
    els.exportButton = document.getElementById("exportButton");
    els.csvFileInput = document.getElementById("csvFileInput");
    els.toast = document.getElementById("toast");
  }

  function bindEvents() {
    els.form.addEventListener("submit", handleSubmit);
    els.cancelEditButton.addEventListener("click", resetForm);
    els.importButton.addEventListener("click", () => els.csvFileInput.click());
    els.exportButton.addEventListener("click", exportCsv);
    els.csvFileInput.addEventListener("change", importCsv);
    els.calendarToggleButton.addEventListener("click", toggleCalendar);
    els.prevMonthButton.addEventListener("click", () => moveCalendarMonth(-1));
    els.todayMonthButton.addEventListener("click", () => {
      state.calendarMonth = todayIso().slice(0, 7);
      renderCalendar();
    });
    els.nextMonthButton.addEventListener("click", () => moveCalendarMonth(1));

    els.searchInput.addEventListener("input", (event) => {
      state.search = event.target.value.trim().toLowerCase();
      renderTable();
    });

    els.statusFilter.addEventListener("change", (event) => {
      state.status = event.target.value;
      renderTable();
    });

    els.sortSelect.addEventListener("change", (event) => {
      state.sort = event.target.value;
      renderTable();
    });
  }

  function populateCountryList() {
    const fragment = document.createDocumentFragment();
    PLACES.forEach((country) => {
      const option = document.createElement("option");
      option.value = country;
      fragment.appendChild(option);
    });
    els.countryList.appendChild(fragment);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormMessage("");

    const record = readFormRecord();
    const validationError = validateRecord(record);
    if (validationError) {
      setFormMessage(validationError);
      return;
    }

    const id = Number(els.stayId.value);
    const overlapWarnings = findOverlapWarnings(record, id);
    if (overlapWarnings.length) {
      const confirmed = window.confirm(buildOverlapWarningMessage(overlapWarnings));
      if (!confirmed) {
        setFormMessage("Stay not saved. Adjust the dates or confirm the warning if the overlap is intentional.");
        return;
      }
    }

    const now = new Date().toISOString();

    try {
      if (id) {
        await db.stays.update(id, {
          ...record,
          updatedAt: now
        });
        showToast("Stay updated.");
      } else {
        await db.stays.add({
          ...record,
          createdAt: now,
          updatedAt: now
        });
        showToast("Stay added.");
      }

      resetForm();
      await loadStays();
    } catch (error) {
      setFormMessage(error.message || "Could not save the stay.");
    }
  }

  function readFormRecord() {
    return {
      country: canonicalPlaceName(normalizeText(els.countryInput.value)),
      startDate: els.startDateInput.value,
      endDate: els.endDateInput.value,
      notes: normalizeText(els.notesInput.value)
    };
  }

  function validateRecord(record) {
    if (!record.country) {
      return "Country is required.";
    }

    if (!isIsoDate(record.startDate)) {
      return "Start day is required.";
    }

    if (record.endDate && !isIsoDate(record.endDate)) {
      return "End date must be a valid date.";
    }

    if (record.endDate && compareDates(record.endDate, record.startDate) < 0) {
      return "End date cannot be before the start day.";
    }

    return "";
  }

  function findOverlapWarnings(record, currentId) {
    return state.stays
      .filter((stay) => stay.id !== currentId)
      .map((stay) => ({
        stay,
        days: overlappingDays(record, stay)
      }))
      .filter((overlap) => overlap.days > 1)
      .sort((a, b) => {
        if (a.days !== b.days) {
          return b.days - a.days;
        }

        return compareDates(a.stay.startDate, b.stay.startDate);
      });
  }

  function overlappingDays(record, stay) {
    const overlapStart = Math.max(dateOrdinal(record.startDate), dateOrdinal(stay.startDate));
    const overlapEnd = Math.min(endOrdinal(record), endOrdinal(stay));

    if (overlapEnd < overlapStart) {
      return 0;
    }

    if (!Number.isFinite(overlapEnd)) {
      return Number.POSITIVE_INFINITY;
    }

    return overlapEnd - overlapStart + 1;
  }

  function endOrdinal(record) {
    return record.endDate ? dateOrdinal(record.endDate) : Number.POSITIVE_INFINITY;
  }

  function buildOverlapWarningMessage(overlaps) {
    const shown = overlaps.slice(0, 3).map((overlap) => {
      const duration = Number.isFinite(overlap.days)
        ? `${formatNumber(overlap.days)} day${overlap.days === 1 ? "" : "s"} overlap`
        : "open-ended overlap";
      return `- ${countryLabel(overlap.stay.country)}, ${formatDateRange(overlap.stay)} (${duration})`;
    });
    const extra = overlaps.length > shown.length
      ? `\n- ${formatNumber(overlaps.length - shown.length)} more overlapping stay${overlaps.length - shown.length === 1 ? "" : "s"}`
      : "";

    return [
      "This stay overlaps an existing stay by more than one day, so totals may double-count days.",
      "",
      shown.join("\n") + extra,
      "",
      "Save anyway?"
    ].join("\n");
  }

  function resetForm() {
    els.form.reset();
    els.stayId.value = "";
    els.formTitle.textContent = "Add a stay";
    els.submitButton.textContent = "Add stay";
    els.cancelEditButton.hidden = true;
    setFormMessage("");
  }

  async function loadStays() {
    state.stays = await db.stays.toArray();
    render();
  }

  function render() {
    renderStats();
    renderCalendarVisibility();
    renderCalendar();
    renderBreakdowns();
    renderTable();
  }

  function renderStats() {
    const stats = buildStats(state.stays);
    const cards = [
      {
        label: "Country-days",
        value: formatNumber(stats.totalDays),
        detail: `${formatNumber(stats.completedDays)} completed, ${formatNumber(stats.activeDays)} current`
      },
      {
        label: "Countries logged",
        value: formatNumber(stats.uniqueCountries),
        detail: `${formatNumber(stats.totalStays)} stay${stats.totalStays === 1 ? "" : "s"} recorded`
      },
      {
        label: "Current stay",
        value: stats.currentCountries.length ? stats.currentCountries.map(countryLabel).join(", ") : "None",
        detail: stats.upcomingCount ? `${stats.upcomingCount} upcoming` : "No upcoming stays",
        countryValue: stats.currentCountries.length > 0
      },
      {
        label: "Longest stay",
        value: stats.longest ? `${formatNumber(stats.longest.days)} d` : "0 d",
        detail: stats.longest ? `${countryLabel(stats.longest.country)}, ${formatDate(stats.longest.startDate)}` : "No completed or active stays"
      }
    ];

    els.statsGrid.replaceChildren(...cards.map(renderStatCard));
  }

  function renderStatCard(card) {
    const article = document.createElement("article");
    article.className = "stat-card";

    const label = document.createElement("p");
    label.className = "label";
    label.textContent = card.label;

    const value = document.createElement("p");
    value.className = "value";
    value.textContent = card.value;
    if (card.countryValue) {
      value.classList.add("country-value");
    }

    const detail = document.createElement("p");
    detail.className = "detail";
    detail.textContent = card.detail;

    article.append(label, value, detail);
    return article;
  }

  function renderBreakdowns() {
    renderBarList(els.countryBreakdown, buildCountryTotals(state.stays), "No country totals yet.");
    renderBarList(els.yearBreakdown, buildYearTotals(state.stays), "No yearly totals yet.");
  }

  function renderBarList(container, items, emptyMessage) {
    container.replaceChildren();

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "muted-text";
      empty.textContent = emptyMessage;
      container.appendChild(empty);
      return;
    }

    const max = Math.max(...items.map((item) => item.days));
    const fragment = document.createDocumentFragment();

    items.slice(0, 8).forEach((item) => {
      const row = document.createElement("div");
      row.className = "bar-row";

      const header = document.createElement("div");
      header.className = "bar-row-header";

      const label = document.createElement("span");
      label.textContent = item.country ? countryLabel(item.country) : item.label;

      const value = document.createElement("span");
      value.textContent = `${formatNumber(item.days)} d`;

      const track = document.createElement("div");
      track.className = "bar-track";

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.setProperty("--bar-width", `${Math.max(4, (item.days / max) * 100)}%`);

      header.append(label, value);
      track.appendChild(fill);
      row.append(header, track);
      fragment.appendChild(row);
    });

    container.appendChild(fragment);
  }

  function moveCalendarMonth(offset) {
    state.calendarMonth = addMonths(state.calendarMonth, offset);
    renderCalendar();
  }

  function toggleCalendar() {
    state.calendarOpen = !state.calendarOpen;
    renderCalendarVisibility();
    renderCalendar();
  }

  function renderCalendarVisibility() {
    els.calendarPanel.hidden = !state.calendarOpen;
    els.calendarToggleButton.textContent = state.calendarOpen ? "Hide calendar" : "Show calendar";
    els.calendarToggleButton.setAttribute("aria-expanded", String(state.calendarOpen));
  }

  function renderCalendar() {
    if (!state.calendarOpen) {
      els.calendarGrid.replaceChildren();
      els.calendarMonthLabel.textContent = "";
      els.calendarSummary.textContent = "";
      return;
    }

    const days = buildCalendarDays(state.calendarMonth, state.stays);
    const fragment = document.createDocumentFragment();
    let flaggedDays = 0;
    const flaggedCountries = new Set();

    els.calendarMonthLabel.textContent = formatMonthLabel(state.calendarMonth);

    days.forEach((day) => {
      if (day.inCurrentMonth && day.countries.length) {
        flaggedDays += 1;
        day.countries.forEach((country) => flaggedCountries.add(country));
      }
      fragment.appendChild(renderCalendarDay(day));
    });

    els.calendarGrid.replaceChildren(fragment);

    if (!flaggedDays) {
      els.calendarSummary.textContent = `No flags in ${els.calendarMonthLabel.textContent}.`;
      return;
    }

    els.calendarSummary.textContent = `${formatNumber(flaggedDays)} flagged day${flaggedDays === 1 ? "" : "s"} from ${formatNumber(flaggedCountries.size)} place${flaggedCountries.size === 1 ? "" : "s"}.`;
  }

  function renderCalendarDay(day) {
    const cell = document.createElement("article");
    cell.className = "calendar-day";
    if (!day.inCurrentMonth) {
      cell.classList.add("outside-month");
    }
    if (day.iso === todayIso()) {
      cell.classList.add("today");
    }
    if (day.countries.length) {
      cell.classList.add("has-stay");
    }

    const number = document.createElement("span");
    number.className = "calendar-day-number";
    number.textContent = String(Number(day.iso.slice(8, 10)));

    const flags = document.createElement("div");
    flags.className = "calendar-flags";

    day.countries.slice(0, 3).forEach((country) => {
      const flag = document.createElement("span");
      flag.className = "calendar-flag";
      flag.textContent = countryFlag(country) || countryInitials(country);
      flag.title = country;
      flag.setAttribute("aria-label", country);
      flags.appendChild(flag);
    });

    if (day.countries.length > 3) {
      const more = document.createElement("span");
      more.className = "calendar-more";
      more.textContent = `+${day.countries.length - 3}`;
      flags.appendChild(more);
    }

    const label = day.countries.length
      ? `${formatDate(day.iso)}: ${day.countries.map(countryLabel).join(", ")}`
      : `${formatDate(day.iso)}: no country logged`;
    cell.setAttribute("aria-label", label);
    cell.title = label;
    cell.append(number, flags);
    return cell;
  }

  function buildCalendarDays(month, stays) {
    const monthStart = `${month}-01`;
    const monthStartOrdinal = dateOrdinal(monthStart);
    const firstWeekday = new Date(monthStartOrdinal * MS_PER_DAY).getUTCDay();
    const leadingDays = (firstWeekday + 6) % 7;
    const gridStart = monthStartOrdinal - leadingDays;

    return Array.from({ length: 42 }, (_, index) => {
      const ordinal = gridStart + index;
      const iso = isoFromOrdinal(ordinal);
      return {
        iso,
        inCurrentMonth: iso.slice(0, 7) === month,
        countries: countriesForDate(stays, ordinal)
      };
    });
  }

  function countriesForDate(stays, ordinal) {
    const countries = new Set();
    stays.forEach((stay) => {
      const start = dateOrdinal(stay.startDate);
      const end = stay.endDate ? dateOrdinal(stay.endDate) : Number.POSITIVE_INFINITY;
      if (ordinal >= start && ordinal <= end) {
        countries.add(stay.country);
      }
    });
    return [...countries].sort((a, b) => a.localeCompare(b));
  }

  function renderTable() {
    const rows = getFilteredStays();
    els.tableBody.replaceChildren();
    els.emptyState.hidden = state.stays.length > 0;

    if (!rows.length && state.stays.length > 0) {
      const empty = document.createElement("p");
      empty.className = "muted-text list-empty";
      empty.textContent = "No stays match the current filters.";
      els.tableBody.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    rows.forEach((stay) => fragment.appendChild(renderStayRow(stay)));
    els.tableBody.appendChild(fragment);
  }

  function renderStayRow(stay) {
    const row = document.createElement("article");
    row.className = "stay-card";
    const status = getStayStatus(stay);

    const marker = document.createElement("div");
    marker.className = `stay-marker status-${status}`;
    const flag = countryFlag(stay.country);
    marker.textContent = flag || countryInitials(stay.country);
    marker.setAttribute("aria-label", flag ? `${stay.country} flag` : `${stay.country} initials`);
    if (flag) {
      marker.classList.add("has-flag");
    }

    const main = document.createElement("div");
    main.className = "stay-main";

    const top = document.createElement("div");
    top.className = "stay-topline";

    const country = document.createElement("h3");
    country.textContent = countryLabel(stay.country);

    const pill = document.createElement("span");
    pill.className = `status-pill status-${status}`;
    pill.textContent = titleCase(status);

    const route = document.createElement("div");
    route.className = "stay-route";

    const start = document.createElement("span");
    start.textContent = formatDate(stay.startDate);

    const line = document.createElement("span");
    line.className = "route-line";
    line.setAttribute("aria-hidden", "true");

    const end = document.createElement("span");
    end.textContent = stay.endDate ? formatDate(stay.endDate) : "Ongoing";

    const meta = document.createElement("div");
    meta.className = "stay-meta";

    const days = document.createElement("span");
    days.textContent = `${formatNumber(daysForStay(stay))} country-days`;

    const notes = document.createElement("span");
    notes.textContent = stay.notes || "";

    const actions = document.createElement("div");
    actions.className = "stay-actions";
    const actionWrap = document.createElement("div");
    actionWrap.className = "row-actions";

    const edit = document.createElement("button");
    edit.className = "button ghost compact";
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editStay(stay));

    const remove = document.createElement("button");
    remove.className = "button danger compact";
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteStay(stay));

    actionWrap.append(edit, remove);
    actions.appendChild(actionWrap);

    top.append(country, pill);
    route.append(start, line, end);
    meta.appendChild(days);
    if (stay.notes) {
      meta.appendChild(notes);
    }
    main.append(top, route, meta);
    row.append(marker, main, actions);
    return row;
  }

  function getFilteredStays() {
    return state.stays
      .filter((stay) => {
        const matchesSearch = !state.search
          || stay.country.toLowerCase().includes(state.search)
          || (stay.notes || "").toLowerCase().includes(state.search);
        const matchesStatus = state.status === "all" || getStayStatus(stay) === state.status;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (state.sort === "oldest") {
          return compareDates(a.startDate, b.startDate)
            || compareDates(sortEndDate(a), sortEndDate(b))
            || compareCountries(a, b);
        }

        if (state.sort === "country") {
          return compareCountries(a, b)
            || compareNewestDates(a, b);
        }

        if (state.sort === "days") {
          return daysForStay(b) - daysForStay(a)
            || compareNewestDates(a, b);
        }

        return compareNewestDates(a, b)
          || compareCountries(a, b);
      });
  }

  function editStay(stay) {
    els.stayId.value = stay.id;
    els.countryInput.value = stay.country;
    els.startDateInput.value = stay.startDate;
    els.endDateInput.value = stay.endDate || "";
    els.notesInput.value = stay.notes || "";
    els.formTitle.textContent = "Edit stay";
    els.submitButton.textContent = "Save changes";
    els.cancelEditButton.hidden = false;
    els.countryInput.focus();
  }

  async function deleteStay(stay) {
    const confirmed = window.confirm(`Delete ${stay.country} from ${formatDate(stay.startDate)}?`);
    if (!confirmed) {
      return;
    }

    await db.stays.delete(stay.id);
    if (Number(els.stayId.value) === stay.id) {
      resetForm();
    }
    showToast("Stay deleted.");
    await loadStays();
  }

  async function exportCsv() {
    const stays = await db.stays.orderBy("startDate").toArray();
    const rows = stays.map((stay) => [
      stay.country,
      stay.startDate,
      stay.endDate || "",
      stay.notes || ""
    ]);
    const csv = toCsv([["country", "start_date", "end_date", "notes"], ...rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `country-days-${todayIso()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast(`Exported ${stays.length} stay${stays.length === 1 ? "" : "s"}.`);
  }

  async function importCsv(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const result = parseImportRows(text);
      if (!result.records.length) {
        showToast(result.errors.length ? `No rows imported. ${result.errors[0]}` : "No valid rows found.");
        return;
      }

      const existingKeys = new Set(state.stays.map(recordKey));
      const now = new Date().toISOString();
      const records = [];
      let duplicates = 0;

      result.records.forEach((record) => {
        const key = recordKey(record);
        if (existingKeys.has(key)) {
          duplicates += 1;
          return;
        }
        existingKeys.add(key);
        records.push({
          ...record,
          createdAt: now,
          updatedAt: now
        });
      });

      if (records.length) {
        await db.stays.bulkAdd(records);
      }

      await loadStays();
      const skipped = result.errors.length + duplicates;
      showToast(`Imported ${records.length} row${records.length === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}.`);
    } catch (error) {
      showToast(error.message || "Could not import the CSV file.");
    }
  }

  function parseImportRows(text) {
    const rows = parseCsv(text.replace(/^\uFEFF/, ""));
    const result = {
      records: [],
      errors: []
    };

    if (!rows.length) {
      return result;
    }

    const firstRow = rows[0].map((cell) => normalizeHeader(cell));
    const hasHeader = firstRow.some((cell) => ["country", "startdate", "startday", "start", "enddate", "end", "notes", "note"].includes(cell));
    const indexes = hasHeader
      ? {
          country: findHeaderIndex(firstRow, ["country", "name"]),
          startDate: findHeaderIndex(firstRow, ["startdate", "startday", "start"]),
          endDate: findHeaderIndex(firstRow, ["enddate", "end"]),
          notes: findHeaderIndex(firstRow, ["notes", "note"])
        }
      : {
          country: 0,
          startDate: 1,
          endDate: 2,
          notes: 3
        };

    if (indexes.country < 0 || indexes.startDate < 0) {
      result.errors.push("CSV needs country and start_date columns.");
      return result;
    }

    const dataRows = hasHeader ? rows.slice(1) : rows;

    dataRows.forEach((row, index) => {
      if (row.every((cell) => !normalizeText(cell))) {
        return;
      }

      const rowNumber = index + (hasHeader ? 2 : 1);
      const country = canonicalPlaceName(normalizeText(row[indexes.country] || ""));
      const startDate = normalizeImportedDate(row[indexes.startDate] || "");
      const endDate = normalizeImportedDate(row[indexes.endDate] || "");
      const notes = indexes.notes >= 0 ? normalizeText(row[indexes.notes] || "") : "";

      const record = { country, startDate, endDate, notes };
      const error = validateRecord(record);
      if (error) {
        result.errors.push(`Row ${rowNumber}: ${error}`);
        return;
      }

      result.records.push(record);
    });

    return result;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === "\"") {
        if (inQuotes && next === "\"") {
          field += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") {
          i += 1;
        }
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }

    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  function toCsv(rows) {
    return rows
      .map((row) => row.map(escapeCsvField).join(","))
      .join("\r\n");
  }

  function escapeCsvField(value) {
    const text = String(value ?? "");
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  }

  function findHeaderIndex(headers, names) {
    return headers.findIndex((header) => names.includes(header));
  }

  function normalizeHeader(value) {
    return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function normalizeText(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  }

  function normalizeImportedDate(value) {
    const text = normalizeText(value);
    if (!text) {
      return "";
    }

    if (isIsoDate(text)) {
      return text;
    }

    const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
      return buildIsoDate(Number(slash[3]), Number(slash[1]), Number(slash[2]));
    }

    const dot = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dot) {
      return buildIsoDate(Number(dot[3]), Number(dot[2]), Number(dot[1]));
    }

    return "";
  }

  function buildIsoDate(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid = date.getUTCFullYear() === year
      && date.getUTCMonth() + 1 === month
      && date.getUTCDate() === day;

    if (!valid) {
      return "";
    }

    return [
      String(year).padStart(4, "0"),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0")
    ].join("-");
  }

  function buildStats(stays) {
    const today = todayIso();
    const uniqueCountries = new Set(stays.map((stay) => stay.country)).size;
    let totalDays = 0;
    let completedDays = 0;
    let activeDays = 0;
    let longest = null;
    let upcomingCount = 0;
    const currentCountries = [];

    stays.forEach((stay) => {
      const days = daysForStay(stay);
      const status = getStayStatus(stay);
      totalDays += days;

      if (status === "current") {
        activeDays += daysBetweenInclusive(stay.startDate, today);
        currentCountries.push(stay.country);
      } else if (status === "past") {
        completedDays += days;
      } else if (status === "upcoming") {
        upcomingCount += 1;
      }

      if (!longest || days > longest.days) {
        longest = { ...stay, days };
      }
    });

    return {
      totalDays,
      completedDays,
      activeDays,
      uniqueCountries,
      totalStays: stays.length,
      longest,
      upcomingCount,
      currentCountries
    };
  }

  function buildCountryTotals(stays) {
    const totals = new Map();
    stays.forEach((stay) => {
      totals.set(stay.country, (totals.get(stay.country) || 0) + daysForStay(stay));
    });

    return [...totals.entries()]
      .map(([country, days]) => ({ label: country, country, days }))
      .filter((item) => item.days > 0)
      .sort((a, b) => b.days - a.days || a.label.localeCompare(b.label));
  }

  function buildYearTotals(stays) {
    const totals = new Map();

    stays.forEach((stay) => {
      const start = dateOrdinal(stay.startDate);
      const effectiveEnd = stay.endDate || todayIso();
      const end = dateOrdinal(effectiveEnd);

      if (end < start) {
        return;
      }

      for (let ordinal = start; ordinal <= end; ordinal += 1) {
        const year = new Date(ordinal * MS_PER_DAY).getUTCFullYear();
        totals.set(year, (totals.get(year) || 0) + 1);
      }
    });

    return [...totals.entries()]
      .map(([label, days]) => ({ label: String(label), days }))
      .sort((a, b) => Number(b.label) - Number(a.label));
  }

  function daysForStay(stay) {
    if (!stay.startDate) {
      return 0;
    }

    if (!stay.endDate && compareDates(stay.startDate, todayIso()) > 0) {
      return 0;
    }

    return daysBetweenInclusive(stay.startDate, stay.endDate || todayIso());
  }

  function daysBetweenInclusive(startDate, endDate) {
    const start = dateOrdinal(startDate);
    const end = dateOrdinal(endDate);
    return Math.max(0, end - start + 1);
  }

  function getStayStatus(stay) {
    const today = todayIso();
    if (compareDates(stay.startDate, today) > 0) {
      return "upcoming";
    }

    if (stay.endDate && compareDates(stay.endDate, today) < 0) {
      return "past";
    }

    return "current";
  }

  function isIsoDate(value) {
    if (!DATE_RE.test(value)) {
      return false;
    }

    const [, year, month, day] = value.match(DATE_RE);
    return buildIsoDate(Number(year), Number(month), Number(day)) === value;
  }

  function compareDates(a, b) {
    return dateOrdinal(a) - dateOrdinal(b);
  }

  function compareCountries(a, b) {
    return a.country.localeCompare(b.country);
  }

  function compareNewestDates(a, b) {
    return compareDates(b.startDate, a.startDate)
      || compareDates(sortEndDate(b), sortEndDate(a));
  }

  function sortEndDate(stay) {
    if (stay.endDate) {
      return stay.endDate;
    }

    const today = todayIso();
    return compareDates(stay.startDate, today) > 0 ? stay.startDate : today;
  }

  function addMonths(month, offset) {
    const [year, monthNumber] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
    const nextYear = date.getUTCFullYear();
    const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${nextYear}-${nextMonth}`;
  }

  function dateOrdinal(value) {
    const [, year, month, day] = value.match(DATE_RE);
    return Date.UTC(Number(year), Number(month) - 1, Number(day)) / MS_PER_DAY;
  }

  function isoFromOrdinal(ordinal) {
    const date = new Date(ordinal * MS_PER_DAY);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function todayIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const [, year, month, day] = value.match(DATE_RE);
    return `${year}-${month}-${day}`;
  }

  function formatDateRange(record) {
    return `${formatDate(record.startDate)} to ${record.endDate ? formatDate(record.endDate) : "Ongoing"}`;
  }

  function formatMonthLabel(month) {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      timeZone: "UTC",
      year: "numeric"
    }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  }

  function titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function recordKey(record) {
    return [
      record.country.toLowerCase(),
      record.startDate,
      record.endDate || "",
      (record.notes || "").toLowerCase()
    ].join("|");
  }

  function countryLabel(country) {
    const canonical = canonicalPlaceName(country);
    const flag = countryFlag(canonical);
    return flag ? `${flag} ${canonical}` : canonical;
  }

  function countryFlag(country) {
    const code = PLACE_CODES[normalizeCountryKey(country)];
    if (!code || code.length !== 2) {
      return "";
    }

    const base = 127397;
    return code
      .toUpperCase()
      .split("")
      .map((letter) => String.fromCodePoint(base + letter.charCodeAt(0)))
      .join("");
  }

  function normalizeCountryKey(country) {
    return normalizeText(country).toLowerCase();
  }

  function canonicalPlaceName(country) {
    return PLACE_NAME_ALIASES[normalizeCountryKey(country)] || country;
  }

  function countryInitials(country) {
    return canonicalPlaceName(country)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "??";
  }

  function setFormMessage(message) {
    els.formMessage.textContent = message;
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.hidden = false;
    state.toastTimer = window.setTimeout(() => {
      els.toast.hidden = true;
    }, 4200);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !window.location.protocol.startsWith("http")) {
      return;
    }

    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // The app still works without the service worker.
    });
  }
})();
