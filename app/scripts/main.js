/*global require*/
'use strict';

require.config({
    shim: {
        underscore: {
            exports: '_'
        },
        backbone: {
            deps: [
                'underscore',
                'jquery',
                'highcharts'
            ],
            exports: 'Backbone'
        },
        highcharts: {
            deps: ['jquery'],
            exports: 'jQuery.fn.highcharts'
        },
    },
    paths: {
        jquery: '../bower_components/jquery/jquery',
        backbone: '../bower_components/backbone/backbone',
        underscore: '../bower_components/underscore/underscore',
        highcharts: '../bower_components/highcharts-release/highcharts'
    }
});

require([
    'backbone'
], function (Backbone) {

    var RouterController = Backbone.Router.extend({
        routes: {
            ''          : 'thumbnail',
            ':query'    : 'chart',
        },

        thumbnail: function() {},
        chart: function(query) {
            new Chart().render({
                page: query
            });
        }
    }),
    Chart = Backbone.View.extend({
        el: $(".chartsContainer"),
        template: _.template($('#chartPageTemplate').html()),

        render: function(data) {
            $(this.el).html(this.template(data));

            function checkData(){
                if(Object.keys(parsedCurrency).length){
                    setTimeout(renderChart, 15, {
                        index       : i,
                        currencyDict: [parsedCurrency[currencyNameDict[i]]],
                        width       : 400,
                        height      : 220
                    }, $('.chartContainer'))
                } else {
                    setTimeout(checkData, 250);
                }
            }
            checkData();
        }
    }),
    ViewHandler = Backbone.View.extend({
      events: {
        "change": "changeView"
      },
      changeView: function(evt) {
        if(!this.$el[0].checked){
            var oldPage = $('.chart-list'),
                newpage = $('#bigChart');
        } else {
            var oldPage = $('#bigChart'),
                newpage = $('.chart-list');
        }

        oldPage.removeClass('active').one('transitionend', function(){
            $(this).removeClass('visible');
            newpage.addClass('visible active');
        });
      }
    }),
    ChartListElement = Backbone.View.extend({
        el: $(".chart-list"),
        template: _.template($('#chartTemplate').html()),

        render: function(data) {
            $(this.el).append(this.template(data));
            setTimeout(renderChart, 15, data)
        }
    });

    var router       = new RouterController(),
        viewHandler  = new ViewHandler({el: "#triggerView"});

    router.on("route", function(page, query) {
        // page transition animation
        var newPage = $('#'+ (query[0] ? query[0] : page)),
            oldPage = $('.page.active');

        if(oldPage.length){
            oldPage.removeClass('active').one('transitionend', function(){
                $(this).removeClass('visible');
                newPage.addClass('visible active');
            });
        } else {
            newPage.addClass('visible active');
        }
    });

    var currencies          = [],
        parsedCurrency      = {},
        currencyNameDict    = [];

    for(var i=0, len=7; i<len; i++){
        // get last 7 days money curriencies from European Central Bank
        var respDate    = new Date(new Date().setDate(new Date().getDate() - i)),
            year        = respDate.getFullYear()+'-',
            month       = (respDate.getMonth()+1 < 10 ? '0'+(respDate.getMonth()+1) : respDate.getMonth()+1)+'-',
            date        = respDate.getDate() < 10 ? '0'+respDate.getDate() : respDate.getDate();

        if(i<len-1){
            $.get('http://api.fixer.io/'+year+month+date, pushData);
        } else {
            $.get('http://api.fixer.io/'+year+month+date, function(data){
                pushData(data);
                allDataLoaded();
            });
        }

        function pushData(data){
            currencies.push(data);
        }
    }

    function allDataLoaded(){
        var currencyPreparedData = [];

        // sort array by date
        currencies = currencies.sort(function(a, b){
            var keyA = Date.parse(a.date),
                keyB = Date.parse(b.date);
            if(keyA < keyB) return -1;
            if(keyA > keyB) return 1;
            return 0;
        });

        currencyNameDict    = Object.keys(currencies[0].rates);

        for (var i=0; i<currencyNameDict.length; i++) {
            parsedCurrency[currencyNameDict[i]] = {
                name: currencyNameDict[i],
                data: []
            }
        };

        for (var i=0; i<currencies.length; i++) {
            for(var i2=0, len2=Object.keys(currencies[i].rates).length; i2<len2; i2++){
                var objVal = Object.keys(currencies[i].rates)[i2];
                parsedCurrency[objVal].data.push(currencies[i].rates[objVal]);
            }
        };

        for(var i=0,len=Object.keys(parsedCurrency).length;i<len;i++){
            new ChartListElement().render({
                index       : i,
                name        : 'EUR to '+Object.keys(parsedCurrency)[i],
                description : 'information from European Central Bank.',
                currencyDict: [parsedCurrency[currencyNameDict[i]]],
                chart       : {
                    reflow: false,
                    width: 400,
                    height: 220
                }
            })
        }

        renderChart({
            currencyDict : $.map(parsedCurrency, function(value, index) {
                return [value];
            })
        }, $('#bigChart'));
    }

    function renderChart(data, element){
        element = element && element.length ? element : $('#chartWidget'+data.index+' .chartWrapper');
        element.highcharts({
            chart: data.chart ? data.chart : {},
            title: {
                text: 'Last 7 days currency changes',
                x: -20 //center
            },
            xAxis: {
                categories: (function(){
                    var days    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                        dayArr  = [];

                    for(var i2=7,len2=0;i2>=len2;i2--){
                        dayArr.push(days[new Date(new Date().setDate(new Date().getDate() - i2)).getDay()]);
                    }
                    return dayArr;
                })()
            },
            yAxis: {
                title: {
                    text: 'Index'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                borderWidth: 0
            },
            series: data.currencyDict
        });
    }

    Backbone.history.start();
});
