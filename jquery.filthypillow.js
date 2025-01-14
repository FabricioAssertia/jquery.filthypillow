/* jquery.filthypillow v.1.4.0
 * simple and fancy datetimepicker
 * by aef
 */
( function( factory ) {
  if ( typeof define === 'function' && define.amd ) {
    define( [ 'jquery' ], factory );
  } else if ( typeof exports === 'object' ) {
    module.exports = factory;
  } else {
    factory( jQuery );
  }
} ( function( $ ) {
  var pluginName = "filthypillow",
      name = "plugin_" + pluginName,
      defaults = {
        startStep: "day",
        minDateTime: null,
        maxDateTime: null, //function returns moment obj
        initialDateTime: null, //function returns moment obj
        enableCalendar: true,
        steps: [ "month", "day", "year", "hour", "minute", "meridiem" ],
        exitOnBackgroundClick: true,
        enable24HourTime: false,
        minuteStepSize: 15,
        calendar: {
          isPinned: false,
          saveOnDateSelect: false
        },
        stepsOrder: ["month", "day", "year"],
        dateFormat: { month: "MM", day: "DD",  year: "YYYY" }
      },
      methods = [ "show", "hide", "destroy", "updateDateTime", "updateDateTimeUnit", "setTimeZone" ],
      returnableMethods = [ "getDate", "isValid" ];

  function FilthyPillow( $element, options ) {
    var calendarOptions = $.extend( {}, defaults.calendar, options.calendar || {} );


    if( options.enable24HourTime && !options.steps ) //remove meridiem
      options.steps = defaults.steps.slice( 0, -1 );

    this.options = $.extend( {}, defaults, options );

    this.options.calendar = calendarOptions;

    this.$element = $element;
    this.setup( );
  }

  FilthyPillow.prototype = {
    template: '<div class="fp-container">' +
                '<div>' +
                  '<div class="fp-calendar">' +
                  '</div>' +
                  '<div class="fp-clock">' +
                    '<span class="fp-hour fp-option"></span>:<span class="fp-minute fp-option"></span>' +
                    '<span class="fp-meridiem fp-option"></span>' +
                  '</div>' +
                '</div>' +
                '<div class="clearfix">' +
                  '<div class="fp-now"><button class="btn btn-block btn-default fp-now-button" type="button">Now</button></div>' +
                  '<div class="fp-save"><button class="btn btn-block btn-primary fp-save-button" type="button">Save</button></div>' +
                '</div>' +
                '<div class="fp-description"></div>' +
                '<div class="fp-errors"></div>' +
                '<div class="fp-calendar-calendar"></div>' +
                '<div class="fp-current"></div>' +
                '<div class="fp-arrows">' +
                  '<span class="fp-arrow-up">&#9652;</span>' +
                  '<span class="fp-arrow-down">&#9662;</span>' +
                '</div>' +
              '</div>',
    currentStep: null,
    dateTime: null,
    currentTimeZone: null, //null is browser default
    currentDigit: 0, //first or second digit for key press
    isActiveLeadingZero: 0, //user types in 0 as first digit
    stepRegExp: null,
    isError: false, //error is being shown
    isActive: false, //whether the calendar is active or not
   
    setup: function( ) {
      this.steps = this.options.steps;
      this.stepRegExp = new RegExp( this.steps.join( "|" ) )
      this.$window = $( window );
      this.$document = $( document );
      this.$body = $( "body" );
      this.id = "filthypillow-" + Math.round( Math.random( ) * 1000 );

      this.$container = $( this.template );
      this.$container.attr( "id", this.id );

      this.$calendar = this.$container.find( ".fp-calendar" );
      this.$options = this.$container.find( ".fp-option" );

      var dateTemplate = {  "day" : '<span class="fp-day fp-option"></span>', "month" : '<span class="fp-month fp-option"></span>', "year" : '<span class="fp-year fp-option"></span>' };
      this.$calendar.html(dateTemplate[this.options.stepsOrder[0]] + '/' + dateTemplate[this.options.stepsOrder[1]] + '/' + dateTemplate[this.options.stepsOrder[2]]);
      
      this.$month = this.$calendar.find( ".fp-month" );
      this.$day = this.$calendar.find( ".fp-day" );
      this.$year = this.$calendar.find( ".fp-year" );

      this.$clock = this.$container.find( ".fp-clock" );
      this.$hour = this.$clock.find( ".fp-hour" );
      this.$minute = this.$clock.find( ".fp-minute" );
      this.$meridiem = this.$clock.find( ".fp-meridiem" );

      this.$errorBox = this.$container.find( ".fp-errors" );
      this.$saveButton = this.$container.find( ".fp-save-button" );
      this.$nowButton = this.$container.find( ".fp-now-button" );
      this.$descriptionBox = this.$container.find( ".fp-description" );

      this.$currentContainer = this.$container.find( ".fp-current" );
      this.$arrowsContainer = this.$container.find( ".fp-arrows" );
      this.$arrowUp = this.$container.find( ".fp-arrow-up" );
      this.$arrowDown = this.$container.find( ".fp-arrow-down" );


      if( this.options.enable24HourTime )
        this.$meridiem.hide( );
      if( this.options.enableCalendar )
        this.calendar = new Calendar( this.$container.find( ".fp-calendar-calendar" ),
        {
          minDateTime: this.options.minDateTime,
          maxDateTime: this.options.maxDateTime,
          onSelectDate: $.proxy( function( year, month, date, opts ) {
            this.updateDateTimeUnit( "month", month, false );
            this.updateDateTimeUnit( "date", date, false );
            this.updateDateTimeUnit( "year", year, false );

            if( this.options.calendar.saveOnDateSelect && opts.activeDateClicked )
              this.$saveButton.click( );
          }, this )
        } );

      this.setInitialDateTime( );
    },
    showError: function( step, errorMessage ) {
      if(step && this[ "$" + step ]){
        this[ "$" + step ].addClass( "fp-error fp-out-of-range" );
      }
      this.$errorBox.text( errorMessage ).show( );
      this.$saveButton.attr( "disabled", "disabled" );
      this.isError = true;
    },
    hideError: function( step, errorMessage ) {
      this.$container.find( ".fp-error" ).removeClass( "fp-error" );
      this.$errorBox.hide( );
      this.$saveButton.removeAttr( "disabled", "disabled" );
      this.isError = false;
    },
    activateSelectorTool: function( step ) {
      var $element = this[ "$" + step ];
      this.currentStep = step;

      //Highlight element

      this.$container.find( ".active" ).unwrap( this.$currentContainer );
      this.$container.find( ".active" ).removeClass( "active" );

      $element.addClass( "active" );

      //Reset digit
      this.currentDigit = 0;
      this.isActiveLeadingZero = 0;
      if( this.options.enableCalendar ) {
        if( step === "day" || step === "month" || step === "year")
          this.calendar.show( );
        else if( !this.options.calendar.isPinned )
          this.calendar.hide( );
      }

      $element.wrap( this.$currentContainer );
      $element.after( this.$arrowsContainer );
    },

    to12Hour: function( value ) {
      if( this.dateTime.format( "A" ) === "PM" && value > 12 )
        return value - 12;
      return value;
    },

    to24Hour: function( value ) {
      if( this.dateTime.format( "A" ) === "PM" && value < 12 )
        return value + 12;
      else if( this.dateTime.format( "A" ) === "AM" && value > 11 )
        return value - 12;
      return value;
    },

    formatToMoment: function( step, value ) {
      if( step === "month" )
        return value - 1;
      return value;
    },

    formatFromMoment: function( step, value ) {
      if( step === "month" )
        return value + 1;
      return value;
    },

    isValidDigitInput: function( digits ) {
      digits = parseInt( digits, 10 );
      if( this.currentStep === "month" ) {
        if( digits > 12 )
          return false;
      }
      else if( this.currentStep === "day" ) {
        if( digits > this.dateTime.daysInMonth( ) )
          return false;
      }

      return true;
    },

    updateDigit: function( step, digit, value ) {
      var fakeValue, precedingDigit, moveNext = false;

      if( step === "meridiem" )
        return;

      if( step === "day" )
        step = "date"; //see moment getter/setter docs

      if( digit === 1 && value === 0 ) {
        this.isActiveLeadingZero = 1;
        return;
      }

      if( digit > 1 && !this.isActiveLeadingZero ) {
        precedingDigit = this.dateTime.get( step );
        if( step === "hour" )
          precedingDigit = this.to12Hour( precedingDigit )
        else
          precedingDigit = this.formatFromMoment( step, precedingDigit );
        fakeValue = parseInt( precedingDigit + "" + value, 10 );
      }
      else
        this.isActiveLeadingZero = 0;

      fakeValue = fakeValue || value;

      if( step === "hour" ) { //this is retain the current meridiem
        if( !this.options.enable24HourTime )
          fakeValue = this.to24Hour( fakeValue );
      }
      else
        fakeValue = this.formatToMoment( step, fakeValue );

      if( !this.isValidDigitInput( fakeValue ) ) {
        if( this.currentDigit === (this.currentStep == "year" ? 4 : 2) )
          this.currentDigit = 1;
        return;
      }

      if( this.currentDigit === (this.currentStep == "year" ? 4 : 2) )
        moveNext = true;
      else if( step === "month" && value > 1 )
        moveNext = true;
      else if( step === "date" && value > 3 )
        moveNext = true;
      else if( step === "hour" && ( ( value > 1 && !this.options.enable24HourTime ) || value > 2 ) )
        moveNext = true;
      else if( step === "minute" && value > 5 )
        moveNext = true;

      this.updateDateTimeUnit( step, fakeValue, moveNext );
    },

    onOptionClick: function( e ) {
      var $target = $( e.target ),
          classes = $target.attr( "class" ),
      //figure out which step was clicked
          step = classes.match( this.stepRegExp );
      if( step && step.length )
        this.activateSelectorTool( step[ 0 ] );
    },

    onKeyUp: function( e ) {
      var keyCode = e.keyCode || e.which;
      if( this.currentStep === "meridiem" )
        return;

      if( keyCode === 8 ) //backspace
        this.currentDigit -= 1;

      //0-9 with numpad support
      if( ( keyCode >= 48 && keyCode <= 57 ) || ( keyCode >= 96 && keyCode <= 105 ) ) {
        this.currentDigit += 1;
        this.updateDigit( this.currentStep, this.currentDigit, keyCode % 48 );
      }

      if( this.currentDigit === (this.currentStep == "year" ? 4 : 2) )
        this.currentDigit = 0;
    },

    onKeyDown: function( e ) {
      var keyCode = e.keyCode || e.which;
      switch( keyCode ) {
        case 38: this.moveUp( ); break; //up
        case 40: this.moveDown( ); break; //down
        case 37: this.moveLeft( ); break; //left
        case 39: this.moveRight( ); break; //right
        case 65: if( this.currentStep === "meridiem" ) { this.changeMeridiem('a'); } break;
        case 80: if( this.currentStep === "meridiem" ) { this.changeMeridiem('p'); } break;
      }
      if( e.shiftKey && keyCode === 9 ) //shift + tab
        this.moveLeft( );
      else if( keyCode === 9 ) //tab
        this.moveRight( );

      if( keyCode === 13 ) //enter - lets them save on enter
        this.$saveButton.click( );

      //prevents page from moving left/right/up/down/submitting form on enter
      return false;
    },

    moveDown: function( ) {
      if( this.currentStep === "meridiem" ) {
        this.changeMeridiem();
      }
      else if( this.currentStep === "minute" )
        this.changeDateTimeUnit( this.currentStep, parseInt(this.options.minuteStepSize) * -1 );
      else if( this.currentStep )
        this.changeDateTimeUnit( this.currentStep, -1 );

      this.currentDigit = 0;
    },

    moveUp: function( ) {
      if( this.currentStep === "meridiem" ) {
        this.changeMeridiem();
      }
      else if( this.currentStep === "minute" )
        this.changeDateTimeUnit( this.currentStep, parseInt(this.options.minuteStepSize) );
      else if( this.currentStep )
        this.changeDateTimeUnit( this.currentStep, 1 );

      this.currentDigit = 0;
    },

    changeMeridiem: function(ampm){
      var offset = parseInt( this.dateTime.format( "H" ), 10 ) < 12 ? 12 : -12;

      if(ampm){
        switch(ampm.toLowerCase()){
          case 'a':
            offset = offset < 0 ? offset : 0;
            break;
          case 'p':
            offset = offset > 0 ? offset : 0;
            break;
        }
      }

      this.changeDateTimeUnit( "hour", offset );
    },

    moveLeft: function( ) {
      if( !this.currentStep ) return;
      var i = this.steps.indexOf( this.currentStep );
      if( i === 0 ) i = this.steps.length - 1;
      else i -= 1;
      this.activateSelectorTool( this.steps[ i ] );
    },

    moveRight: function( ) {
      if( !this.currentStep ) return;
      var i = this.steps.indexOf( this.currentStep );
      if( i === this.steps.length - 1 ) i = 0;
      else i += 1;
      this.activateSelectorTool( this.steps[ i ] );
    },

    onClickToExit: function( e ) {
      var $target = $( e.target );
      if(
          //TODO: testing for class is shit but closest doesn't work on td day select
          //for some reason
          !/fp-/.test( $target.attr( "class" ) ) &&
          !$target.closest( this.$container ).length &&
          !$target.closest( this.$element ).length ) {
        this.hide( );
      }
    },

    onSave: function( ) {
      if( this.isInRange( this.dateTime ) )
        this.$element.trigger( "fp:save", [ this.dateTime ] );
    },

    onNow: function( ) {
      this.setDateTime(new Date());
      this.renderDateTime();
      this.dateChange();
    },

    addEvents: function( ) {
      this.$options.on( "click", $.proxy( this.onOptionClick, this ) );
      this.$saveButton.on( "click", $.proxy( this.onSave, this ) );

      this.$nowButton.on( "click", $.proxy( this.onNow, this ) );

      this.$document.on( "keydown." + this.id, $.proxy( this.onKeyDown, this ) );
      this.$document.on( "keyup." + this.id, $.proxy( this.onKeyUp, this ) );

      this.$arrowDown.on( "click", $.proxy( this.moveDown, this ) );
      this.$arrowUp.on( "click", $.proxy( this.moveUp, this ) );

      this.$document.on( "scroll", $.proxy( this.hide, this ) );

      if( this.options.exitOnBackgroundClick )
        this.$window.on( "click" , $.proxy( this.onClickToExit, this ) );
    },

    removeEvents: function( ) {

      this.$options.off( "click" );
      this.$saveButton.off( "click" );
      this.$window.off( "click." + this.id );

      this.$document.off( "keydown." + this.id );
      this.$document.off( "keyup." + this.id );

      this.$document.off( "scroll" );
    },
    setDateTime: function( dateObj, moveNext ) {
      this.dateTime = moment( dateObj );

      if( this.options.enableCalendar )
        this.calendar.setDate( this.dateTime );

      if( !this.isInRange( this.dateTime ) )
        this.showError( this.currentStep, "Date is out of range, please fix." );
      else if( this.isError )
        this.hideError( );

      if( !this.isError && moveNext )
        this.moveRight( );
    },
    renderDateTime: function( ) {
      this.$year.text( this.dateTime.format( this.options.dateFormat.year ) );
      this.$month.text( this.dateTime.format( this.options.dateFormat.month ) );
      this.$day.text( this.dateTime.format( this.options.dateFormat.day ) );
      this.$hour.text( this.dateTime.format( !this.options.enable24HourTime ? "hh" : "HH" )  );
      this.$minute.text( this.dateTime.format( "mm" ) );
      if( !this.options.enable24HourTime )
        this.$meridiem.text( this.dateTime.format( "A" ) );

      this.$descriptionBox.text( this.dateTime.format( "LLLL" ) );
    },
    setInitialDateTime: function( ) {
      var m = moment( ),
          minutes = m.format( "m" );
      m.zone( this.currentTimeZone );

      //Initial value are done in increments of 15 from now.
      //If the time between now and 15 minutes from now is less than 5 minutes,
      //go onto the next 15.
      if( typeof this.options.initialDateTime === "function" )
        m = this.options.initialDateTime( m.clone( ) );

      this.updateDateTime( m );
    },

    isInRange: function( date ) {
      var minDateTime = typeof this.options.minDateTime === "function" && this.options.minDateTime( ),
          maxDateTime = typeof this.options.maxDateTime === "function" && this.options.maxDateTime( ),
          left = right = false;

      if( minDateTime ) {
        minDateTime.zone( this.currentTimeZone );
        left = date.diff( minDateTime, "second" ) < 0;
      }
      if( maxDateTime ) {
        maxDateTime.zone( this.currentTimeZone );
        right = date.diff( maxDateTime, "second" ) > 0;
      }

      return !( right || left )
    },

    setTimeZone: function( zone ) {
      this.dateTime.zone( zone );
      this.currentTimeZone = zone;

      if( this.options.enableCalendar )
      this.calendar.setTimeZone( zone );
    },

    dateChange: function( ) {
      if( this.options.enableCalendar ) {
        this.calendar.setDate( this.dateTime );
        if( this.currentStep === "day" || this.currentStep === "month" || this.currentStep === "year" )
          this.calendar.render( );
      }
      this.$element.trigger("fp:datetimechange", [ this.dateTime ]);
    },

    changeDateTimeUnit: function( unit, value ) {
      var tmpDateTime = this.dateTime.clone( ).add( value, unit + "s" ),
          isInRange = this.isInRange( tmpDateTime );

      if( !this.isError && !isInRange )
        this.showError( this.currentStep, "Date is out of range, please fix." );
      else if( isInRange )
        this.hideError( );

      this.dateTime.add( value, unit + "s" );
      this.renderDateTime( );

      this.dateChange( );
    },
    //api
    updateDateTimeUnit: function( unit, value, moveNext ) {
      var dateObj = this.dateTime.clone( ).set( unit, value );
      this.updateDateTime( dateObj, moveNext );
    },
    getDate: function( ) {
      return this.dateTime.clone( );
    },
    isValid: function( ) {
      return !this.isError;
    },
    updateDateTime: function( dateObj, moveNext ) {
      this.setDateTime( dateObj, moveNext );
      this.renderDateTime( );
      this.dateChange( );
    },
    checkPositionInterval: null,
    clearCheckPositionInterval: function(){
      if(this.checkPositionInterval != null){
        clearInterval(this.checkPositionInterval);
      }
      this.checkPositionInterval = null;
    },
    currentPosition: {
      top: null,
      left: null
    },
    positionElement: function(){
      var top = this.currentPosition.top;
      if(this.$window.scrollTop() + this.$window.height() < this.currentPosition.top + this.$container.height()){
        top = this.currentPosition.top - this.$container.height() - this.$element.height();
      }

      var left = this.currentPosition.left;
      if(this.$window.scrollLeft() + this.$window.width() < this.currentPosition.left + this.$container.width()){
        left = this.$window.width() - this.$container.width();
      }

      this.$container.css({
        left: left+'px',
        top: top+'px'
      });
    },
    getElementPosition: function(){
      var offset = this.$element.offset();
      return {
        top: offset.top + this.$element.height(),
        left: offset.left
      }
    },
    show: function( ) {
      if( !this.isActive ) {
        this.setInitialDateTime( );

          this.clearCheckPositionInterval();

          $('body').prepend(this.$container);
          this.$container.hide();

          this.checkPositionInterval = setInterval(function(){
            if(!$(this.$element).is(':visible')) return this.hide();
            var pos = this.getElementPosition();
            this.$container.show();
            this.currentPosition = pos;
            this.positionElement();
          }.bind(this),250);



        this.activateSelectorTool( this.options.startStep );
        this.addEvents( );
        this.isActive = true;
      }
    },
    hide: function( ) {
      this.clearCheckPositionInterval();
      this.currentPosition.left = this.currentPosition.top = null;
      if( this.isActive ) {
        this.$container.remove( );
        this.removeEvents( );
        this.isActive = false;
        this.$element.trigger( "fp:hide", [ this.dateTime ] );
      }
    },
    destroy: function( ) {
      this.clearCheckPositionInterval();
      this.currentPosition.left = this.currentPosition.top = null;
      this.removeEvents( );
      this.$container.remove( );
      this.isActive = false;
      this.$element.removeData( name );
    }
  };

  function Calendar( $element, options ) {
    var setup, renderDayLabels;

    this.options = $.extend( { }, options );
    this.date = moment( );
    this.$element = $element;

    this.currentTimeZone = null;

    var template = '<div class="fp-cal-container">' +
                      '<div class="fp-cal-nav">' +
                        '<span class="fp-cal-left">&#9668;</span>' +
                        '<span class="fp-cal-month"></span>' +
                        '<span class="fp-cal-right">&#9658;</span>' +
                      '</div>' +
                      '<table>' +
                        '<thead><tr class="fp-cal-days"></tr></thead>' +
                        '<tbody class="fp-cal-dates"></tbody>' +
                      '</div>' +
                    '</div>',
    dateTemplate = '<td class="fp-cal-date" data-date=""></td>',
    weekTemplate = '<tr class="fp-cal-week"></tr>',
    dayLabelTemplate = '<th class="fp-cal-day-label"></th>';

    this.$container = $( template );
    this.$left = this.$container.find( ".fp-cal-left" );
    this.$right = this.$container.find( ".fp-cal-right" );
    this.$month = this.$container.find( ".fp-cal-month" );
    this.$days = this.$container.find( ".fp-cal-days" );
    this.$dates = this.$container.find( ".fp-cal-dates" );
    this.$dateTemplate = $( dateTemplate );
    this.$weekTemplate = $( weekTemplate );
    this.$dayLabelTemplate = $( dayLabelTemplate );

    this.buildDayLabels( );
  }

  //date {Moment}
  Calendar.prototype.setDate = function( date ) {
    this.date = date.clone( );
  };

  Calendar.prototype.removeEvents = function( ) {
    this.$right.off( "click" );
    this.$left.off( "click" );
    this.$dates.find( ".fp-cal-date:not( .fp-disabled )" ).off( "click" );
  };

  Calendar.prototype.addEvents = function( ) {
    this.$right.on( "click", $.proxy( this.nextMonth, this ) );
    this.$left.on( "click", $.proxy( this.prevMonth, this ) );
    this.$dates.find( ".fp-cal-date:not( .fp-disabled )" ).on( "click", $.proxy( this.onSelectDate, this ) );
  };

  Calendar.prototype.toggleMonthArrows = function( ) {
    if( this.isInMinRange( this.date.clone( ).subtract( 1, 'month' ).endOf( "month" ) ) )
      this.$left.show( );
    else
      this.$left.hide( );

    if( this.isInMaxRange( this.date.clone( ).add( 1, 'month' ).date( 1 ) ) )
      this.$right.show( );
    else
      this.$right.hide( );
  };

  Calendar.prototype.nextMonth = function( ) {
    this.date.add( 1, 'month' );
    this.selectDate( this.date.get( "year" ), this.date.get( "month" ), this.date.get( "date" ) );
    this.render( );
  };

  Calendar.prototype.prevMonth = function( ) {
    this.date.subtract( 1, 'month' );
    this.selectDate( this.date.get( "year" ), this.date.get( "month" ), this.date.get( "date" ) );
    this.render( );
  };

    Calendar.prototype.nextYear = function( ) {
    this.date.add( 1, 'year' );
    this.selectDate( this.date.get( "year" ), this.date.get( "month" ), this.date.get( "date" ) );
    this.render( );
  };

  Calendar.prototype.prevYear = function( ) {
    this.date.subtract( 1, 'year' );
    this.selectDate( this.date.get( "year" ), this.date.get( "month" ), this.date.get( "date" ) );
    this.render( );
  };

  Calendar.prototype.selectDate = function( year, month, date, opts ) {
    if( typeof this.options.onSelectDate === "function" )
      this.options.onSelectDate( year, month, date, opts || { } );
    this.highlightDate( date );
  };

  Calendar.prototype.onSelectDate = function( e ) {
    var $target = $( e.target ),
        addMonths = parseInt( $target.attr( "data-add-month" ), 10 );

    this.date.add( addMonths, 'month' );

    this.selectDate( this.date.get( "year" ), this.date.get( "month" ), $target.attr( "data-date" ), { activeDateClicked: !addMonths } );
  };

  Calendar.prototype.highlightDate = function( date ) {
    this.$dates.find( ".active" ).removeClass( "active" );
    this.$dates.find( ".fp-cal-date-" + date ).addClass( "active" );
  };

  Calendar.prototype.buildTemplate = function( ) {
    this.$month.text( this.date.format( "MMMM YYYY" ) )
               .attr( "data-month", this.date.get( "month" ) + 1 );
    this.toggleMonthArrows( );
    this.buildDates( );
    this.disableOutOfRangeDates( );
    this.highlightDate( this.date.get( "date" ) );
  };

  Calendar.prototype.isInMinRange = function( date ) {
    if( typeof this.options.minDateTime !== "function" )
      return true;
    var minDate = this.options.minDateTime( );
    minDate.zone( this.currentTimeZone );
    return date.diff( minDate, "second" ) > 0;
  };

  Calendar.prototype.isInMaxRange = function( date ) {
    if( typeof this.options.maxDateTime !== "function" )
      return true;
    var maxDate = this.options.maxDateTime( );
    maxDate.zone( this.currentTimeZone );
    return date.diff( maxDate, "second" ) < 0;
  };

  Calendar.prototype.disableOutOfRangeDates = function( ) {
    var self = this,
        dateTmp,
        $this;

    if( typeof self.options.maxDateTime !== "function" && typeof self.options.minDateTime !== "function" )
      return;

    this.$dates.find( ".fp-cal-date" ).filter( function( ) {
      dateTmp = self.date.clone( );
      $this = $( this );

      if( $this.attr( "data-add-month" ) )
        dateTmp.add( parseInt( $this.attr( "data-add-month" ), 10 ), 'month' );

      dateTmp.date( parseInt( $( this ).attr( "data-date" ), 10 ) );
      return !( self.isInMinRange( dateTmp ) && self.isInMaxRange( dateTmp ) );
    } ).addClass( "fp-disabled" );
  };

  Calendar.prototype.buildDayLabels = function( ) {
    //do this for moment's locale setting
    var labelMaker = this.date.clone( );

    for( var i = 0; i < 7; ++i )
      this.$dayLabelTemplate.clone( ).text(
          labelMaker.day( i ).format( "ddd" ) ).appendTo( this.$days );
  };

  Calendar.prototype.buildDates = function( ) {
    var days = this.date.daysInMonth( ),
        dateCalc = this.date.clone( ),
        lastDayOfPrevMonth = this.date.clone( ).subtract( 1, 'month' ).endOf( "month" ).date( ),
        $week = this.$weekTemplate.clone( ),
        firstWeekDay = dateCalc.date( 1 ).weekday( ),
        lastWeekDay = dateCalc.date( days ).weekday( ),
        $day, i;
    this.$dates.empty( );
    //calculates previous months days
    for( i = 0; i < firstWeekDay; ++i )
      this.$dateTemplate.clone( )
          .attr( "data-add-month", -1 )
          .attr( "data-date", lastDayOfPrevMonth - i )
          .addClass( "fp-cal-date-prev-" + lastDayOfPrevMonth - i )
          .addClass( "fp-not-in-month" ).text( lastDayOfPrevMonth - i )
          .prependTo( $week );

    //fill first week starting from days prior
    for( i = 1; i <= 7 - firstWeekDay; ++i )
      this.$dateTemplate.clone( )
          .addClass( "fp-cal-date-" + i )
          .attr( "data-date", i ).text( i )
          .appendTo( $week );

    $week.appendTo( this.$dates );
    $week = this.$weekTemplate.clone( );
    $week.appendTo( this.$dates );

    //Uses i from previous for loop
    for(; i <= days; ++i ) {
      if( ( i + firstWeekDay - 1 ) % 7 === 0 ) {
        $week = this.$weekTemplate.clone( );
        $week.appendTo( this.$dates );
      }
      this.$dateTemplate.clone( )
          .addClass( "fp-cal-date-" + i )
          .attr( "data-date", i ).text( i )
          .appendTo( $week );
    }

    //calculates next months days for remaining week
    for( i = 1; i < 7 - lastWeekDay; ++i )
      this.$dateTemplate.clone( )
          .addClass( "fp-cal-date-next-" + i )
          .attr( "data-add-month", 1 )
          .attr( "data-date", i ).addClass( "fp-not-in-month" ).text( i )
          .appendTo( $week );
  };

  Calendar.prototype.render = function( ) {
    this.buildTemplate( );
    this.removeEvents( );
    this.addEvents( );
  };

  Calendar.prototype.show = function( ) {
    this.render( );
    this.$container.appendTo( this.$element );
  };

  Calendar.prototype.hide = function( ) {
    this.$container.remove( );
    this.removeEvents( );
  };

  Calendar.prototype.get = function( ) {
    return this.$container;
  };

  Calendar.prototype.setTimeZone = function( zone ) {
    this.currentTimeZone = zone;
  };

  $.fn[ pluginName ] = function( optionsOrMethod ) {
    var $this,
        _arguments = Array.prototype.slice.call( arguments ),
        optionsOrMethod = optionsOrMethod || { };
    //Initialize a new version of the plugin
    if( ( typeof optionsOrMethod ).toLowerCase( ) === "string" && ~$.inArray( optionsOrMethod, returnableMethods ) )
      return this.data( name )[ optionsOrMethod ].apply( this.data( name ), _arguments.slice( 1, _arguments.length ) );
    else {
      return this.each(function ( ) {
        $this = $( this );
        if( !$this.data( name ) && ( typeof optionsOrMethod ).toLowerCase( ) === "object" )
          $this.data( name, new FilthyPillow( $this, optionsOrMethod ) );
        else if( ( typeof optionsOrMethod ).toLowerCase( ) === "string" ) {
          if( ~$.inArray( optionsOrMethod, methods ) )
            $this.data( name )[ optionsOrMethod ].apply( $this.data( name ), _arguments.slice( 1, _arguments.length ) );
          else
            throw new Error( "Method " + optionsOrMethod + " does not exist. Did you instantiate filthypillow?" );
        }
      } );
    }
  };
} ) );
