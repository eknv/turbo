/***
 * Contains basic SlickGrid editors.
 * @module Editors
 * @namespace Slick
 */

(function ($) {
    // register namespace
    $.extend(true, window, {
        "Slick": {
            "Editors": {
                "Dynamic": DynamicEditor,
                "None": None,
                "Text": TextEditor,
                "Integer": IntegerEditor,
                "Float": FloatEditor,
                "Date": DateEditor,
                "Time": TimeEditor,
                "DateTime": DateTimeEditor,
                "YesNoSelect": YesNoSelectEditor,
                "Select": SelectEditor,
                "Checkbox": CheckboxEditor,
                "PercentComplete": PercentCompleteEditor,
                "LongText": LongTextEditor
            }
        }
    });

    function None(args) {
        var $input;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $input = $("<div></div>").appendTo(args.container);
        };

        this.destroy = function () {
            $input.remove();
        };

        this.disable = function () {
            /*$input.prop('disabled', true);*/
        };

        this.enable = function () {
            /*$input.prop('disabled', false);*/
        };

        this.focus = function () {
            $input.focus();
        };

        this.getValue = function () {
            return $input.text();
        };

        this.setValue = function (val) {
            $input.text(val);
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field] || "";
            $input.text(defaultValue);
        };

        this.serializeValue = function () {
            return $input.text();
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return false;
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function TextEditor(args) {
        var $input;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $input = $("<INPUT type=text class='editor-text' />")
                .appendTo(args.container)
                .on("keydown.nav", function (e) {
                    if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
                        e.stopImmediatePropagation();
                    }
                })
                .focus()
                .select();
        };

        this.destroy = function () {
            $input.remove();
        };

        this.disable = function () {
            $input.prop('disabled', true);
        };

        this.enable = function () {
            $input.prop('disabled', false);
        };

        this.focus = function () {
            $input.focus();
        };

        this.getValue = function () {
            return $input.val();
        };

        this.setValue = function (val) {
            $input.val(val);
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field] || "";
            $input.val(defaultValue);
            $input[0].defaultValue = defaultValue;
            $input.select();
        };

        this.serializeValue = function () {
            return $input.val();
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
        };

        this.validate = function () {
            if (args.column.validator) {
                var validationResults = args.column.validator($input.val());
                if (!validationResults.valid) {
                    return validationResults;
                }
            }

            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }


    function DynamicEditor(args) {
        var editor;
        this.getEditor = function () {
            /** if the cell is not editable, return a None editor */
            if (!this.editable()) {
                return new Slick.Editors.None(args);
            }

            if (args.column.$editor) {
                $editor = args.column.$editor;
            } else if (args.item.$editors) {
                var $editor = args.item.$editors[args.column.id];
            } else {
                console.debug("No editors are specified. 'Text' editor will be used by default.");
                return new Slick.Editors.Text(args);
            }
            if ($editor == null) {
                console.debug("No editor is specified for the column with the id " + args.column.id + ". 'Text' editor will be used by default.");
                return new Slick.Editors.Text(args);
            }

            if ($editor == "Text") {
                return new Slick.Editors.Text(args);
            } else if ($editor == "Date") {
                return new Slick.Editors.Date(args);
            } else if ($editor == "Time") {
                return new Slick.Editors.Time(args);
            } else if ($editor == "DateTime") {
                return new Slick.Editors.DateTime(args);
            } else if ($editor == "None") {
                return new Slick.Editors.None(args);
            } else if ($editor == "Integer") {
                return new Slick.Editors.Integer(args);
            } else if ($editor == "Float") {
                return new Slick.Editors.Float(args);
            } else if ($editor == "YesNoSelect") {
                return new Slick.Editors.YesNoSelect(args);
            } else if ($editor == "Select") {
                return new Slick.Editors.Select(args);
            } else if ($editor == "Checkbox") {
                return new Slick.Editors.Checkbox(args);
            } else if ($editor == "PercentComplete") {
                return new Slick.Editors.PercentComplete(args);
            } else if ($editor == "LongText") {
                return new Slick.Editors.LongText(args);
            } else {
                console.error("No editor is available for the requested type " + $editor)
                return null;
            }
        };

        this.init = function () {
            editor = this.getEditor();
        };

        this.destroy = function () {
            editor.destroy();
        };

        this.disable = function () {
            editor.disable();
        };

        this.enable = function () {
            editor.enable();
        };

        this.editable = function () {
            if (args.column.$$editable != null) {
                if (typeof args.column.$$editable === "function") {
                    return args.column.$$editable(args.item, args.column);
                } else {
                    return args.column.$$editable
                }
            } else if (args.item.$$editable != null) {
                if (typeof args.item.$$editable === "function") {
                    return args.item.$$editable(args.column);
                } else {
                    return args.item.$$editable
                }
            } else {
                // by default editable
                return true;
            }
        };

        this.focus = function () {
            editor.focus();
        };

        this.getValue = function () {
            return editor.getValue();
        };

        this.setValue = function (val) {
            editor.setValue(val);
        };

        this.loadValue = function (item) {
            editor.loadValue(item);
        };

        this.serializeValue = function () {
            return editor.serializeValue();
        };

        this.applyValue = function (item, newValue) {
            var $$preUpdate = item.$$preUpdate != null ? item.$$preUpdate : args.column.$$preUpdate;
            var $$postUpdate = item.$$postUpdate != null ? item.$$postUpdate : args.column.$$postUpdate;
            var currentValue = item[args.column.id];
            if ($$preUpdate) {
                $$preUpdate(currentValue, newValue, args);
            }
            editor.applyValue(item, newValue);
            if ($$postUpdate) {
                $$postUpdate(currentValue, newValue, args);
            }
        };

        this.isValueChanged = function () {
            return editor.isValueChanged();
        };

        this.validate = function () {
            return editor.validate();
        };

        /**
         * optional methods below
         */

        this.hide = function () {
            if (editor.hide) {
                editor.hide();
            }
        };

        this.show = function () {
            if (editor.show) {
                editor.show();
            }
        };

        this.position = function (cellBox) {
            if (editor.position) {
                editor.position(cellBox);
            }
        };

        this.init();
    }

    function IntegerEditor(args) {
        var $input;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $input = $("<INPUT type=text class='editor-text' />");

            $input.on("keydown.nav", function (e) {
                if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
                    e.stopImmediatePropagation();
                }
            });

            $input.appendTo(args.container);
            $input.focus().select();
        };

        this.destroy = function () {
            $input.remove();
        };

        this.disable = function () {
            $input.prop('disabled', true);
        };

        this.enable = function () {
            $input.prop('disabled', false);
        };

        this.focus = function () {
            $input.focus();
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field];
            $input.val(defaultValue);
            $input[0].defaultValue = defaultValue;
            $input.select();
        };

        this.serializeValue = function () {
            return parseInt($input.val(), 10) || 0;
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
        };

        this.validate = function () {
            if (isNaN($input.val())) {
                return {
                    valid: false,
                    msg: "Please enter a valid integer"
                };
            }

            if (args.column.validator) {
                var validationResults = args.column.validator($input.val());
                if (!validationResults.valid) {
                    return validationResults;
                }
            }

            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function FloatEditor(args) {
        var $input;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $input = $("<INPUT type=text class='editor-text' />");

            $input.on("keydown.nav", function (e) {
                if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
                    e.stopImmediatePropagation();
                }
            });

            $input.appendTo(args.container);
            $input.focus().select();
        };

        this.destroy = function () {
            $input.remove();
        };

        this.disable = function () {
            $input.prop('disabled', true);
        };

        this.enable = function () {
            $input.prop('disabled', false);
        };

        this.focus = function () {
            $input.focus();
        };

        function getDecimalPlaces() {
            // returns the number of fixed decimal places or null
            var rtn = args.column.editorFixedDecimalPlaces;
            if (typeof rtn == 'undefined') {
                rtn = FloatEditor.DefaultDecimalPlaces;
            }
            return (!rtn && rtn !== 0 ? null : rtn);
        }

        this.loadValue = function (item) {
            defaultValue = item[args.column.field];

            var decPlaces = getDecimalPlaces();
            if (decPlaces !== null
                && (defaultValue || defaultValue === 0)
                && defaultValue.toFixed) {
                defaultValue = defaultValue.toFixed(decPlaces);
            }

            $input.val(defaultValue);
            $input[0].defaultValue = defaultValue;
            $input.select();
        };

        this.serializeValue = function () {
            var rtn = parseFloat($input.val()) || 0;

            var decPlaces = getDecimalPlaces();
            if (decPlaces !== null
                && (rtn || rtn === 0)
                && rtn.toFixed) {
                rtn = parseFloat(rtn.toFixed(decPlaces));
            }

            return rtn;
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
        };

        this.validate = function () {
            if (isNaN($input.val())) {
                return {
                    valid: false,
                    msg: "Please enter a valid number"
                };
            }

            if (args.column.validator) {
                var validationResults = args.column.validator($input.val());
                if (!validationResults.valid) {
                    return validationResults;
                }
            }

            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    FloatEditor.DefaultDecimalPlaces = null;


    function DateEditor(args) {
        var $input;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $input = $("<INPUT type=text class='editor-text' />");
            $input.appendTo(args.container);
            $input.focus().select();
            $input.datetimepicker({
                timepicker: false,
                lang: 'en',
                format:'Y-m-d',
                formatDate:'Y-m-d'
            });
        };

        this.destroy = function () {
            $input.datetimepicker('destroy');
            $input.remove();
        };

        this.disable = function () {
            $input.prop('disabled', true);
        };

        this.enable = function () {
            $input.prop('disabled', false);
        };

        this.show = function () {
            $input.datetimepicker('show');
        };

        this.hide = function () {
            $input.datetimepicker('hide');
        };

        this.position = function (position) {
            $.datepicker.dpDiv
                .css("top", position.top + 30)
                .css("left", position.left);
        };

        this.focus = function () {
            $input.focus();
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field];
            $input.datetimepicker({value: defaultValue});
            $input.select();
        };

        this.serializeValue = function () {
            return $input.val();
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
        };

        this.validate = function () {
            if (args.column.validator) {
                var validationResults = args.column.validator($input.val());
                if (!validationResults.valid) {
                    return validationResults;
                }
            }

            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }


    function TimeEditor(args) {
        var $input;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $input = $("<INPUT type=text class='editor-text' />");
            $input.appendTo(args.container);
            $input.focus().select();
            $input.timepickeralone({
                hours: true,
                minutes: true,
                seconds: false,
                ampm: true,
                defaultTime: '00:00',
                inputFormat: 'HH:mm'
            });
        };

        this.destroy = function () {
            $input.timepickeralone('destroy');
            $input.remove();
        };

        this.disable = function () {
            $input.prop('disabled', true);
        };

        this.enable = function () {
            $input.prop('disabled', false);
        };

        this.show = function () {
            $input.timepickeralone('show');
        };

        this.hide = function () {
            $input.timepickeralone('hide');
        };

        this.position = function (position) {
            $input
                .css("top", position.top + 30)
                .css("left", position.left);
        };

        this.focus = function () {
            $input.focus();
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field];
            $input.timepicker("setValue", defaultValue);
        };

        this.serializeValue = function () {
            return $input.val();
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
        };

        this.validate = function () {
            if (args.column.validator) {
                var validationResults = args.column.validator($input.val());
                if (!validationResults.valid) {
                    return validationResults;
                }
            }

            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function DateTimeEditor(args) {
        var $input;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $input = $("<INPUT type=text class='editor-text'/>");
            $input.appendTo(args.container);
            $input.focus().select();
            $input.periodpicker({
                timepicker: true,
                tabIndex: 0,
                formatDate: 'YYYY-MM-D',
                formatDateTime: 'YYYY-MM-D HH:mm:ss',
                norange: true,
                cells: [1, 1],
                animation: true,
                likeXDSoftDateTimePicker: true,
                hideAfterSelect: true
            });
        };

        this.destroy = function () {
            $input.periodpicker('destroy');
            $input.remove();
        };

        this.disable = function () {
            $input.prop('disabled', true);
        };

        this.enable = function () {
            $input.prop('disabled', false);
        };

        this.show = function () {
            $input.focus();
        };

        this.hide = function () { };

        this.position = function (position) {
            $.datepicker.dpDiv
                .css("top", position.top + 30)
                .css("left", position.left);
        };

        this.focus = function () {
            $input.focus();
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field];
            $input.periodpicker('value', defaultValue);
            $input.select();
        };

        this.serializeValue = function () {
            return $input.val();
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
        };

        this.validate = function () {
            if (args.column.validator) {
                var validationResults = args.column.validator($input.val());
                if (!validationResults.valid) {
                    return validationResults;
                }
            }

            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function YesNoSelectEditor(args) {
        var $select;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $select = $("<SELECT tabIndex='0' class='editor-yesno'><OPTION value='yes'>Yes</OPTION><OPTION value='no'>No</OPTION></SELECT>");
            $select.appendTo(args.container);
            $select.focus();
        };

        this.destroy = function () {
            $select.remove();
        };

        this.disable = function () {
            $select.prop('disabled', true);
        };

        this.enable = function () {
            $select.prop('disabled', false);
        };

        this.focus = function () {
            $select.focus();
        };

        this.loadValue = function (item) {
            $select.val((defaultValue = item[args.column.field]) ? "yes" : "no");
            $select.select();
        };

        this.serializeValue = function () {
            return ($select.val() == "yes");
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return ($select.val() != defaultValue);
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function SelectEditor(args) {
        var $select;
        var defaultValue;
        var scope = this;

        this.init = function () {
            var options;
            if (args.column.$options) {
                options = args.column.$options
            } else if (args.item.$options) {
                options = args.item.$options;
            }
            if (typeof options === "function") {
                options = options(args);
            }
            if (options == null) {
                console.error("No options have been provided!")
                return;
            }
            var optionsString = "";
            for (var i = 0; i < options.length; i++) {
                var option = options[i];
                if (typeof option === 'object') {
                    optionsString += "<OPTION value='" + option['id'] + "'>" + option['name'] + "</OPTION>"
                } else {
                    optionsString += "<OPTION value='" + option + "'>" + option + "</OPTION>"
                }
            }
            $select = $("<SELECT tabIndex='0' class='editor-yesno'>" + optionsString + "</SELECT>");
            $select.appendTo(args.container);
            $select.focus();
        };

        this.destroy = function () {
            $select.remove();
        };

        this.disable = function () {
            $select.prop('disabled', true);
        };

        this.enable = function () {
            $select.prop('disabled', false);
        };

        this.focus = function () {
            $select.focus();
        };

        this.loadValue = function (item) {
            $select.val((defaultValue = item[args.column.field]));
            $select.select();
        };

        this.serializeValue = function () {
            return $select.val();
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return ($select.val() != defaultValue);
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function CheckboxEditor(args) {
        var $select;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $select = $("<INPUT type=checkbox value='true' class='editor-checkbox' hideFocus>");
            $select.appendTo(args.container);
            $select.focus();
        };

        this.destroy = function () {
            $select.remove();
        };

        this.disable = function () {
            $select.prop('disabled', true);
        };

        this.enable = function () {
            $select.prop('disabled', false);
        };

        this.focus = function () {
            $select.focus();
        };

        this.loadValue = function (item) {
            defaultValue = !!item[args.column.field];
            if (defaultValue) {
                $select.prop('checked', true);
            } else {
                $select.prop('checked', false);
            }
        };

        this.serializeValue = function () {
            return $select.prop('checked');
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (this.serializeValue() !== defaultValue);
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function PercentCompleteEditor(args) {
        var $input, $picker;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $input = $("<INPUT type=text class='editor-percentcomplete' />");
            $input.width($(args.container).innerWidth() - 25);
            $input.appendTo(args.container);

            $picker = $("<div class='editor-percentcomplete-picker' />").appendTo(args.container);
            $picker.append("<div class='editor-percentcomplete-helper'><div class='editor-percentcomplete-wrapper'><div class='editor-percentcomplete-slider' /><div class='editor-percentcomplete-buttons' /></div></div>");

            $picker.find(".editor-percentcomplete-buttons").append("<button val=0>Not started</button><br/><button val=50>In Progress</button><br/><button val=100>Complete</button>");

            $input.focus().select();

            $picker.find(".editor-percentcomplete-slider").slider({
                orientation: "vertical",
                range: "min",
                value: defaultValue,
                slide: function (event, ui) {
                    $input.val(ui.value)
                }
            });

            $picker.find(".editor-percentcomplete-buttons button").on("click", function (e) {
                $input.val($(this).attr("val"));
                $picker.find(".editor-percentcomplete-slider").slider("value", $(this).attr("val"));
            })
        };

        this.destroy = function () {
            $input.remove();
            $picker.remove();
        };

        this.disable = function () {
            $input.prop('disabled', true);
            $picker.prop('disabled', true);
        };

        this.enable = function () {
            $input.prop('disabled', false);
            $picker.prop('disabled', false);
        };

        this.focus = function () {
            $input.focus();
        };

        this.loadValue = function (item) {
            $input.val(defaultValue = item[args.column.field]);
            $input.select();
        };

        this.serializeValue = function () {
            return parseInt($input.val(), 10) || 0;
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ((parseInt($input.val(), 10) || 0) != defaultValue);
        };

        this.validate = function () {
            if (isNaN(parseInt($input.val(), 10))) {
                return {
                    valid: false,
                    msg: "Please enter a valid positive number"
                };
            }

            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    /*
     * An example of a "detached" editor.
     * The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
     * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
     */
    function LongTextEditor(args) {
        var $input, $wrapper;
        var defaultValue;
        var scope = this;

        this.init = function () {
            var $container = $("body");

            $wrapper = $("<DIV style='z-index:10000;position:absolute;background:white;padding:5px;border:3px solid gray; -moz-border-radius:10px; border-radius:10px;'/>")
                .appendTo($container);

            $input = $("<TEXTAREA hidefocus rows=5 style='backround:white;width:250px;height:80px;border:0;outline:0'>")
                .appendTo($wrapper);

            $("<DIV style='text-align:right'><BUTTON>Save</BUTTON><BUTTON>Cancel</BUTTON></DIV>")
                .appendTo($wrapper);

            $wrapper.find("button:first").on("click", this.save);
            $wrapper.find("button:last").on("click", this.cancel);
            $input.on("keydown", this.handleKeyDown);

            scope.position(args.position);
            $input.focus().select();
        };

        this.handleKeyDown = function (e) {
            if (e.which == $.ui.keyCode.ENTER && e.ctrlKey) {
                scope.save();
            } else if (e.which == $.ui.keyCode.ESCAPE) {
                e.preventDefault();
                scope.cancel();
            } else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
                e.preventDefault();
                args.grid.navigatePrev();
            } else if (e.which == $.ui.keyCode.TAB) {
                e.preventDefault();
                args.grid.navigateNext();
            }
        };

        this.save = function () {
            args.commitChanges();
        };

        this.cancel = function () {
            $input.val(defaultValue);
            args.cancelChanges();
        };

        this.hide = function () {
            $wrapper.hide();
        };

        this.show = function () {
            $wrapper.show();
        };

        this.position = function (position) {
            $wrapper
                .css("top", position.top - 5)
                .css("left", position.left - 5)
        };

        this.destroy = function () {
            $wrapper.remove();
        };

        this.disable = function () {
            $wrapper.prop('disabled', true);
        };

        this.enable = function () {
            $wrapper.prop('disabled', false);
        };

        this.focus = function () {
            $input.focus();
        };

        this.loadValue = function (item) {
            $input.val(defaultValue = item[args.column.field]);
            $input.select();
        };

        this.serializeValue = function () {
            return $input.val();
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
        };

        this.validate = function () {
            if (args.column.validator) {
                var validationResults = args.column.validator($input.val());
                if (!validationResults.valid) {
                    return validationResults;
                }
            }

            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }
})(jQuery);
