function quantile(arr, q) {
	var sorted = arr.sort((a, b) => a - b);
	var pos = (sorted.length - 1) * q;
	var base = Math.floor(pos);
	var rest = pos - base;

	if (sorted[base + 1] !== undefined) {
		return Math.floor(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
	} else {
		return Math.floor(sorted[base]);
	}
}

function prepareData(result) {
	return result.data.map(item => {
		item.date = item.timestamp.split('T')[0];

		return item;
	});
}

function dateToTimestamp(dateString) {
	var arr = dateString.split('-');
	return new Date(arr[0], arr[1] - 1, arr[2]);
}

function addMetricByRange(data, page, name, dateFromString, dateToString) {
	var sampleData = data
		.filter(item => {
			var isCurrent = (item.page == page && item.name == name);
			var curDate = dateToTimestamp(item.date);
			var dateFrom = dateToTimestamp(dateFromString);
			var dateTo = dateToTimestamp(dateToString);
			dateTo.setHours(23);
			dateTo.setMinutes(59);
			dateTo.setSeconds(59);

			return isCurrent
				&& curDate.getTime() > dateFrom.getTime()
				&& curDate.getTime() < dateTo.getTime();
		})
		.map(item => item.value);

	return {
		hits: sampleData.length,
		p25: quantile(sampleData, 0.25),
		p50: quantile(sampleData, 0.5),
		p75: quantile(sampleData, 0.75),
		p95: quantile(sampleData, 0.95)
	};
}

// показать значение метрики за несколько день
function showMetricByPeriod(dateFrom, dateTo, data, page) {
	var table = {
		connect: addMetricByRange(data, page, 'connect', dateFrom, dateTo),
		ttfb: addMetricByRange(data, page, 'ttfb', dateFrom, dateTo),
		imgLoad: addMetricByRange(data, page, 'imgLoad', dateFrom, dateTo),
		domComplete: addMetricByRange(data, page, 'domComplete', dateFrom, dateTo)
	};
	console.info(`All metrics from ${dateFrom} to ${dateTo}:`);
	console.table(table);
}

function addMetricBySession(data, page, name, session) {
	var sampleData = data
		.filter(item => item.requestId == session && item.name == name && item.page == page)
		.map(item => item.value);

	return {
		p25: quantile(sampleData, 0.25),
		p50: quantile(sampleData, 0.5),
		p75: quantile(sampleData, 0.75),
		p95: quantile(sampleData, 0.95),
	};
}

// показать сессию пользователя
function showSession() {
	console.log(`All metrics for session ID #${session}:`);

	var table = {};
	table.connect = addMetricBySession(data, page, 'connect', session);
	table.ttfb = addMetricBySession(data, page, 'ttfb', session);
	table.imgLoad = addMetricBySession(data, page, 'imgLoad', session);
	table.domComplete = addMetricBySession(data, page, 'domComplete', session);

	console.table(table);
}

// сравнить метрику в разных срезах
function compareMetric(data, page, dateFrom, dateTo) {
	var desktop = data.filter(item => item.additional.platform === 'desktop');
	var touch = data.filter(item => item.additional.platform === 'touch');
	console.log('Compare desktop vs Touch');
	showMetricByPeriod(dateFrom, dateTo, desktop, page);
	showMetricByPeriod(dateFrom, dateTo, touch, page);
}


// добавить метрику за выбранный день
function addMetricByDate(data, page, name, date) {
	var sampleData = data
		.filter(item => item.page == page && item.name == name && item.date == date)
		.map(item => item.value);

	var result = {};

	result.hits = sampleData.length;
	result.p25 = quantile(sampleData, 0.25);
	result.p50 = quantile(sampleData, 0.5);
	result.p75 = quantile(sampleData, 0.75);
	result.p95 = quantile(sampleData, 0.95);

	return result;
}

// рассчитывает все метрики за день
function calcMetricsByDate(data, page, date) {
	console.log(`All metrics for ${date}:`);

	var table = {};
	table.connect = addMetricByDate(data, page, 'connect', date);
	table.ttfb = addMetricByDate(data, page, 'ttfb', date);
	table.imgLoad = addMetricByDate(data, page, 'imgLoad', date);
	table.domComplete = addMetricByDate(data, page, 'domComplete', date);

	console.table(table);
};

function start(uuid) {
	if (!uuid) {
		return;
	}
	fetch('https://shri.yandex/hw/stat/data?counterId=' + uuid)
		.then(res => res.json())
		.then(result => {
			var data = prepareData(result);
			var date = new Date().toISOString().slice(0, 10);

			calcMetricsByDate(data, 'index.html', date);
			showMetricByPeriod(date, date, data, 'index.html');
			compareMetric(data, 'index.html', date, date);

		});
}

