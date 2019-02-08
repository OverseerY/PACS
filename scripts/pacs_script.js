'use strict';

//#region Initialization

let periods = ["Сегодня", "Вчера", "Неделя", "Месяц", "Год"];
let labels = ["Сотрудник", "Отдел", "Время", "Период", "Дата"];
let statuses = ["Нормально","Не нормально","Нет данных"];
let event_lables = ["Дата", "Сотрудник", "Отдел", "Первое событие", "Последнее событие"];
let colors = ["#f77871","#efe881","#74c46a"];
let departments = ["*"];
let employees = ["*"];
let staff = [];
let dates_list = [];
let base_url = 'http://192.168.0.14:5003/';
let day_in_mil = 86400000;

//#endregion

//#region Initial load

function initialFunction() {
    let default_url = base_url + 'list';
    loadJson(default_url, function (response) {
        loadListOfEmployeesByDepartments(response);
    });
}

function loadListOfEmployeesByDepartments(response) {
    let raw_array = JSON.parse(response);
    let root_key = Object.keys(raw_array)[0];
    staff = raw_array[root_key];
    parseJsonWithEmployees(staff);
}

function parseJsonWithEmployees(data_array) {
    for (let i = 0; i < data_array.length; i++) {
        if (!departments.includes(data_array[i].department))  {
            departments.push(data_array[i].department);
        }
        if (!employees.includes(data_array[i].employee)) {
            employees.push(data_array[i].employee);
        }
    }
    fillSelectorWithValues("_dropPeriod", periods);
    fillSelectorWithValues("_dropDepartment", departments);
    fillSelectorWithValues("_dropEmployee", employees);
    setActionToButton("_btnShow");
    getEmployeesWithEvents("", "", "", "");
}

function fillSelectorWithValues(selector_id, items_array) {
    let selectBox = document.getElementById(selector_id);
    selectBox.innerHTML = "";
    for (let i = 0; i < items_array.length; i++) {
        let item = items_array[i];
        let option = document.createElement("option");
        option.textContent = item;
        option.value = item;
        selectBox.appendChild(option);
    }
    selectBox.addEventListener("change", function (ev) {
        if (selector_id === "_dropDepartment") {
            departmentSelected(selectBox.value);
        }
    });
}

function departmentSelected(selected_department) {
    if (selected_department !== "*") {
        let employees_by_dep = [];
        employees_by_dep.push("*");
        for (let i = 0; i < staff.length; i++) {
            if (staff[i].department.includes(selected_department) && !employees_by_dep.includes(staff[i].employee)) {
                employees_by_dep.push(staff[i].employee);
            }
        }
        fillSelectorWithValues("_dropEmployee", employees_by_dep);
    } else {
        fillSelectorWithValues("_dropEmployee", employees);
    }
}

//#region ActionButton request

function setActionToButton(elementId) {
    let requestButton = document.getElementById(elementId);
    requestButton.addEventListener("click", function (ev) {
        initRequestBySelectors();
    });
}

function initRequestBySelectors() {
    let start = "";
    let end = "";
    let employee = "";
    let department = "";

    if (getDepartment() !== departments[0]) {
        department = getDepartment();
    }
    if (getEmployee() !== employees[0]) {
        employee = getEmployee();
    }

    if (getPeriod() !== periods[0]) {
        if (getPeriod() === periods[1]) {
            start = getSecondsFromMils(getTodayDateInMillisFromMidnight());
            end = start - getSecondsFromMils(day_in_mil);
            getEmployeesWithEvents(end, start, employee, department);
            
        } else if (getPeriod() === periods[2]) {
            if (getEmployee() !== "*") {
                let emp = getEmployee();
                requestSelectedEmployeeEventsForPeriod(emp, 7);
            } else {
                createTableByDates(7);
            }
        } else if (getPeriod() === periods[3]) {
            if (getEmployee() !== "*") {
                let emp = getEmployee();
                requestSelectedEmployeeEventsForPeriod(emp, 30);
            } else {
                createTableByDates(30);
            }
        } else {
            if (getEmployee() !== "*") {
                let emp = getEmployee();
                requestSelectedEmployeeEventsForPeriod(emp, 365);
            } else {
                createTableByDates(365);
            }
        }
    } else {
        getEmployeesWithEvents(end, start, employee, department);
    }
}

//#endregion


//#endregion

//#region Common functions

function loadJson(url, callback) {
    let xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', url, true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}

function getEmployeesWithEvents(start_time, end_time, employee_name, department_name) {
    let default_url = base_url + 'list2?st=' + start_time + '&et=' + end_time + '&emp=' + employee_name + '&dept=' + department_name;

    loadJson(default_url, function (response) {
        let raw_array = JSON.parse(response);
        let root_key = Object.keys(raw_array)[0];
        buildStaffTable(raw_array[root_key]);
        redesignStaffTable();
    });
}

//#region Additional functions

function convertMillisToDate(value) {
    let date = new Date(parseInt(value, 10));
    let aYear = date.getFullYear();
    let aMonth = date.getMonth() + 1;
    let aDay = date.getDate();
    let aHour = date.getHours();
    let aMinute = date.getMinutes();
    let str = formatDateTwoSign(aDay) + "/" + formatDateTwoSign(aMonth) + "/" + aYear + " " + formatDateTwoSign(aHour) + ":" + formatDateTwoSign(aMinute);
    return str;
}

function convertStringToDate(value) {
    let temp = value.split(" ");
    let t_date = temp[0].split("/");
    let r_date = new Date(t_date[2] + "-" + t_date[1] + "-" + t_date[0]);
    r_date.setHours(0,0,0);
    r_date.setMinutes(0,0,0);
    r_date.setSeconds(0,0);
    r_date.setMilliseconds(0);
    return r_date.getTime();
}

function formatDateTwoSign(value) {
    if (value < 10) {
        return "0" + value;
    } else {
        return value;
    }
}

function formatEventStatus(value) {
    if (value === -1) {
        return statuses[1];
    } else if (value === 1) {
        return statuses[2];
    } else {
        return statuses[0];
    }
}

function checkLastEvent(value) {
    let cur_date = new Date();
    cur_date.setHours(0,0,0);
    cur_date.setMinutes(0,0,0);
    cur_date.setSeconds(0,0);
    let mil = cur_date.getTime();
    let m_hour = 3600000;
    //let m_min = 60000;
    if ((value > (mil + m_hour * 8)) && (value < (mil + m_hour * 17))) {
        return colors[0];
    } else {
        return colors[2];
    }
}

function checkEventStatus(value) {
    if (value === -1) {
        return colors[0];
    } else if (value === 1) {
        return colors[1];
    } else {
        return colors[2];
    }
}

function getTodayDateInMillisFromMidnight() {
    let cur_date = new Date();
    cur_date.setHours(0,0,0);
    cur_date.setMinutes(0,0,0);
    cur_date.setSeconds(0,0);
    cur_date.setMilliseconds(0);
    return cur_date.getTime();
}

function getSecondsFromMils(value) {
    return value/1000;
}

function getPeriod() {
    let selectBox = document.getElementById("_dropPeriod");
    return selectBox.value;
}

function getDepartment() {
    let selectBox = document.getElementById("_dropDepartment");
    return selectBox.value;
}

function getEmployee() {
    let selectBox = document.getElementById("_dropEmployee");
    return selectBox.value;
}

//#endregion

//#endregion

//#region Daily Events

function buildStaffTable(data_array) {
    let table = document.createElement("table");
    table.setAttribute("id", "staffTable");
    table.setAttribute("class", "display");

    let col = [];
    for (let i = 0; i < data_array.length; i++) {
        for (let key in data_array[i]) {
            if (col.indexOf(key) === -1) {
                col.push(key);
            }
        }
    }

    let t_header = table.createTHead();
    let thr = t_header.insertRow(-1);
    for (let i = 0; i < col.length; i++) {
        let th = document.createElement("th");
        th.innerHTML = labels[i];
        thr.appendChild(th);
    }

    let t_body = table.createTBody();
    for (let i = 0; i < data_array.length; i++) {
        let tr = t_body.insertRow(-1);
        for (let j = 0; j < col.length; j++) {
            let tabCell = tr.insertCell(-1);
            if (j === 2) {
                let raw_data = data_array[i][col[j]];
                if (raw_data !== null) {
                    tabCell.innerHTML = convertMillisToDate(raw_data * 1000);
                    tabCell.style.backgroundColor = checkLastEvent(raw_data * 1000);
                } else {
                    tabCell.innerHTML = statuses[2];
                    tabCell.style.backgroundColor = colors[1];
                }
            } else {
                tabCell.innerHTML = data_array[i][col[j]];
            }
        }
    }

    let divContainer = document.getElementById("showData");
    divContainer.innerHTML = "";
    divContainer.appendChild(table);
}

function redesignStaffTable() {
    let table_name = '#staffTable';

    $(document).ready(function () {
        $(document).ready(function () {
            var table = $(table_name).DataTable({
                "paging":   false,
                "info":     false,
                "searching": false
            });

            $(table_name + ' tbody').on('click', 'tr', function () {
                let tr = $(this).closest('tr');
                let row = table.row(tr);

                if (row.child.isShown() ) {
                    row.child.hide();
                    tr.removeClass('shown');
                } else {
                    row.child(format(row.index())).show();
                    tr.addClass('shown');
                    if (row.data() !== undefined && row.data()[2] !== statuses[2]) {
                        requestDayEvents(row.data()[2], row.data()[0], row.index());
                    }
                }
            });
        });
    });
}

function format(d) {
    return '<div align="right" style="padding-right:50px;" id="childContainer' + d + '">\n' +
        '</div>'
}

function requestDayEvents(current_date, emp_name, row_id) {
    let cur_date = convertStringToDate(current_date);
    let start_time = getSecondsFromMils(cur_date);
    let end_time = getSecondsFromMils(day_in_mil) + start_time;

    let default_url = base_url + 'events?emp=' + emp_name + '&st=' + start_time + '&et=' + end_time;

    loadJson(default_url, function (response) {
        let raw_array = JSON.parse(response);
        let root_key = Object.keys(raw_array)[0];
        buildDayEventsTable(raw_array[root_key], row_id);
    });
}

function buildDayEventsTable(data_array, rowId) {
    let str = '<table cellpadding="5" cellspacing="0" border="0">';
    for (let i = 0; i < data_array.length; i++) {
        str += '<tr>' +
            '<td>' + convertMillisToDate(data_array[i].event_time * 1000) + '</td>' +
            '<td bgcolor="' + checkEventStatus(data_array[i].event_status) + '">' + formatEventStatus(data_array[i].event_status) + '</td>' +
            '</tr>';
    }
    str += '</table>';
    let div = document.getElementById("childContainer" + rowId);
    div.innerHTML = str;
}

//#endregion

//#region Events by Date

function createTableByDates(num_of_days) {
    buildArrayOfDates(num_of_days);
    buildDateTable();
    redesignDateTable();
}

/** TODO: Highlight weekends and holidays, desirable don't show these days in table*/
function buildArrayOfDates(num_of_days) {
    let mil = getTodayDateInMillisFromMidnight();
    dates_list = [];
    dates_list.push(mil);
    for (let i = 1; i < num_of_days; i++) {
        mil = mil - day_in_mil;
        dates_list.push(mil);
    }
}

function buildDateTable() {
    let table = document.createElement("table");
    table.setAttribute("id", "datesTable");
    table.setAttribute("class", "display");

    let t_header = table.createTHead();
    let thr = t_header.insertRow(-1);
    for (let i = 0; i < 2; i++) {
        let th = document.createElement("th");
        th.innerHTML = "Дата";
        if (i === 1) {
            th.style.display = "none";
        }
        thr.appendChild(th);
    }

    let t_body = table.createTBody();
    for (let i = 0; i < dates_list.length; i++) {
        let tr = t_body.insertRow(-1);
        for (let j = 0; j < 2; j++) {
            let tabCell = tr.insertCell(-1);
            if (j === 0) {
                tabCell.innerHTML = convertMillisToDate(dates_list[i]);
            } else {
                tabCell.innerHTML = dates_list[i];
                tabCell.style.display = "none";
            }
        }
    }

    let divContainer = document.getElementById("showData");
    divContainer.innerHTML = "";
    divContainer.appendChild(table);
}

function redesignDateTable() {
    $(document).ready(function () {
        $(document).ready(function () {
            let table = $('#datesTable').DataTable({
                "paging": false,
                "info": false,
                "searching": false,
                "order": [[1, "desc"]]
            });


            $('#datesTable tbody').on('click', 'tr', function () {
                let tr = $(this).closest('tr');
                let row = table.row(tr);

                if (row.child.isShown()) {
                    row.child.hide();
                    tr.removeClass('shown');
                } else {
                    row.child(format_table(row.index())).show();
                    tr.addClass('shown');
                    if (row.data() !== undefined) {
                        requestDaily(row.data()[1], row.index());
                    }
                }
            });
        });
    });
}

function format_table(d) {
    return '<div id="childContainer' + d + '">\n' +
        '</div>'
}

function requestDaily(cur_date, row_id) {
    let start_time = getSecondsFromMils(cur_date);
    let end_time = getSecondsFromMils(day_in_mil) + start_time;
    let employee_name = "";
    let department_name = "";

    if (getEmployee() !== employees[0]) {
        employee_name = getEmployee();
    }
    if (getDepartment() !== departments[0]) {
        department_name = getDepartment();
    }

    let default_url = base_url + 'list2?st=' + start_time + '&et=' + end_time + '&emp=' + employee_name + '&dept=' + department_name;

    loadJson(default_url, function (response) {
        let raw_array = JSON.parse(response);
        let root_key = Object.keys(raw_array)[0];
        buildInnerStaffTable(raw_array[root_key], row_id);
    });
}

function buildInnerStaffTable(data_array, row_id) {
    let element_id = 'childContainer' + row_id;
    let table = document.createElement("table");
    table.setAttribute("id", 'innerTable' + row_id);
    table.setAttribute("class", "display");

    let col = [];
    for (let i = 0; i < data_array.length; i++) {
        for (let key in data_array[i]) {
            if (col.indexOf(key) === -1) {
                col.push(key);
            }
        }
    }

    let t_header = table.createTHead();
    let thr = t_header.insertRow(-1);
    for (let i = 0; i < col.length; i++) {
        let th = document.createElement("th");
        th.innerHTML = labels[i];
        thr.appendChild(th);
    }

    let t_body = table.createTBody();
    for (let i = 0; i < data_array.length; i++) {
        let tr = t_body.insertRow(-1);
        for (let j = 0; j < col.length; j++) {
            let tabCell = tr.insertCell(-1);
            if (j === 2) {
                let raw_data = data_array[i][col[j]];
                if (raw_data !== null) {
                    tabCell.innerHTML = convertMillisToDate(raw_data * 1000);
                    tabCell.style.backgroundColor = checkLastEvent(raw_data * 1000);
                } else {
                    tabCell.innerHTML = statuses[2];
                    tabCell.style.backgroundColor = colors[1];
                }
            } else {
                tabCell.innerHTML = data_array[i][col[j]];
            }
        }
    }

    let divContainer = document.getElementById(element_id);
    divContainer.innerHTML = "";
    divContainer.appendChild(table);

    redesignInnerStaffTable(row_id);
}

function redesignInnerStaffTable(row_id) {
    let table_name = '#innerTable' + row_id;

    $(document).ready(function () {
        $(document).ready(function () {
            let table = $(table_name).DataTable({
                "paging":   false,
                "info":     false,
                "searching": false
            });

            $(table_name + ' tbody').on('click', 'tr', function () {
                let tr = $(this).closest('tr');
                let row = table.row(tr);

                if (row.child.isShown() ) {
                    row.child.hide();
                    tr.removeClass('shown');
                } else {
                    row.child(format_inner(row.index(), row_id)).show();
                    tr.addClass('shown');
                    if (row.data() !== undefined && row.data()[2] !== statuses[2]) {
                        requestDateEvents(row.data()[2], row.data()[0], row.index(), row_id);
                    }
                }
            });
        });
    });
}

function format_inner(d, outer_index) {
    return '<div align="right" style="padding-right:50px;" id="subContainer' + d + '_' + outer_index +'">\n' +
        '</div>'
}

function requestDateEvents(current_date, emp_name, row_id, outer_row_id) {
    let cur_date = convertStringToDate(current_date);
    let start_time = getSecondsFromMils(cur_date);
    let end_time = getSecondsFromMils(day_in_mil) + start_time;

    let default_url = base_url + 'events?emp=' + emp_name + '&st=' + start_time + '&et=' + end_time;

    loadJson(default_url, function (response) {
        let raw_array = JSON.parse(response);
        let root_key = Object.keys(raw_array)[0];
        buildDateEventsTable(raw_array[root_key], row_id, outer_row_id);
    });
}

function buildDateEventsTable(data_array, rowId, outer_row_id) {
    let str = '<table cellpadding="5" cellspacing="0" border="0">';
    for (let i = 0; i < data_array.length; i++) {
        str += '<tr>' +
            '<td>' + convertMillisToDate(data_array[i].event_time * 1000) + '</td>' +
            '<td bgcolor="' + checkEventStatus(data_array[i].event_status) + '">' + formatEventStatus(data_array[i].event_status) + '</td>' +
            '</tr>';
    }
    str += '</table>';
    let div = document.getElementById("subContainer" + rowId + "_" + outer_row_id);
    div.innerHTML = str;
}

//#endregion

//#region Events For Period by Person

function requestSelectedEmployeeEventsForPeriod(emp_name, period_value) {
    buildArrayOfDates(period_value);
    getEventsByPerson(emp_name, getSecondsFromMils(dates_list[period_value - 1]), getSecondsFromMils(dates_list[0]));
}

function getEventsByPerson(emp_name, start_date, end_date) {
    let default_url = base_url + 'events2?st=' + start_date + '&et=' + end_date + '&emp=' + emp_name + '&dept=';

    loadJson(default_url, function (response) {
        let raw_array = JSON.parse(response);
        let root_key = Object.keys(raw_array)[0];
        buildEventsByDateForSelectedEmployee(raw_array[root_key]);
    });
}

function buildEventsByDateForSelectedEmployee(data_array) {
    let table = document.createElement("table");
    table.setAttribute("id", "personalEventsTable");
    table.setAttribute("class", "display");

    let t_header = table.createTHead();
    let thr = t_header.insertRow(-1);
    for (let i = 0; i < 6; i++) {
        let th = document.createElement("th");
        th.innerHTML = event_lables[i];

        if (i === 5) {
            th.style.display = "none";
            th.innerHTML = "Дата в мсек";
        }

        thr.appendChild(th);
    }

    dates_list.reverse();

    let t_body = table.createTBody();
    for (let i = 0; i < data_array.length; i++) {
        let tr = t_body.insertRow(-1);
        for (let j = 0; j < 6; j++) {
            let tabCell = tr.insertCell(-1);
            if (j === 0) {
                tabCell.innerHTML = convertMillisToDate(dates_list[i]);
            } else if (j === 1) {
                let employee_name = data_array[i].sname;
                tabCell.innerHTML = employee_name.split("'")[1];
            } else if (j === 2) {
                tabCell.innerHTML = data_array[i].dept;
            } else if (j === 3) {
                let raw_data = data_array[i].event2_time;
                if (raw_data !== null) {
                    tabCell.innerHTML = convertMillisToDate(raw_data * 1000);
                    tabCell.style.backgroundColor = checkPersonalEvents(parseInt(raw_data, 10) * 1000, dates_list[i]);
                } else {
                    tabCell.innerHTML = statuses[2];
                    tabCell.style.backgroundColor = colors[1];
                }
            } else if (j === 4) {
                let raw_data = data_array[i].event1_time;
                if (raw_data !== null) {
                    tabCell.innerHTML = convertMillisToDate(raw_data * 1000);
                    tabCell.style.backgroundColor = checkPersonalEvents(parseInt(raw_data, 10) * 1000, dates_list[i]);
                } else {
                    tabCell.innerHTML = statuses[2];
                    tabCell.style.backgroundColor = colors[1];
                }
            } else {
                tabCell.innerHTML = dates_list[i];
                tabCell.style.display = "none";
            }
        }
    }

    let divContainer = document.getElementById("showData");
    divContainer.innerHTML = "";
    divContainer.appendChild(table);
    redesignPersonalEventsTable();
}

function redesignPersonalEventsTable() {
    $(document).ready(function () {
        $(document).ready(function () {
            let table = $('#personalEventsTable').DataTable({
                "paging": false,
                "info": false,
                "searching": false,
                "order": [[5, "desc"]]
            });


            $('#personalEventsTable tbody').on('click', 'tr', function () {
                let tr = $(this).closest('tr');
                let row = table.row(tr);

                if (row.child.isShown()) {
                    row.child.hide();
                    tr.removeClass('shown');
                } else {
                    row.child(format_personal(row.index())).show();
                    tr.addClass('shown');
                    if (row.data() !== undefined) {
                        requestPersonalEvents(row.data()[5], row.data()[1], row.index());
                    }
                }
            });
        });
    });
}

function requestPersonalEvents(current_date, emp_name, row_id) {
    let start_time = getSecondsFromMils(current_date);
    let end_time = getSecondsFromMils(day_in_mil) + start_time;

    let default_url = base_url + 'events?emp=' + emp_name + '&st=' + start_time + '&et=' + end_time;

    loadJson(default_url, function (response) {
        let raw_array = JSON.parse(response);
        let root_key = Object.keys(raw_array)[0];
        buildPersonalEventsTable(raw_array[root_key], row_id);
    });
}

function buildPersonalEventsTable(data_array, rowId) {
    let str = '<table cellpadding="5" cellspacing="0" border="0">';
    for (let i = 0; i < data_array.length; i++) {
        str += '<tr>' +
            '<td>' + convertMillisToDate(data_array[i].event_time * 1000) + '</td>' +
            '<td bgcolor="' + checkEventStatus(data_array[i].event_status) + '">' + formatEventStatus(data_array[i].event_status) + '</td>' +
            '</tr>';
    }
    str += '</table>';
    let div = document.getElementById("testContainer" + rowId);
    div.innerHTML = str;
}

function format_personal(d) {
    return '<div align="right" style="padding-right:50px;" id="testContainer' + d + '">\n' +
        '</div>'
}

function checkPersonalEvents(value, date_value) {
    let m_hour = 3600000;
    if ((value > (date_value + m_hour * 8)) && (value < (date_value + m_hour * 17))) {
        return colors[0];
    } else {
        return colors[2];
    }
}

//#endregion


















