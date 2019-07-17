(function ($) {
    // Register namespace
    $.extend(true, window, {
        "Slick": {
            "Tooltips": Tooltips
        }
    });

    /**
     * Tooltips plugin to show/hide tooltips when columns are too narrow to fit content.
     * @constructor
     * @param {boolean} [options.enableForCells=true]        - Enable tooltip for grid cells
     * @param {boolean} [options.enableForHeaderCells=false] - Enable tooltip for header cells
     * @param {number}  [options.maxToolTipLength=null]      - The maximum length for a tooltip
     */
    function Tooltips(options) {
        var _grid;
        var _self = this;
        var _defaults = {
            enableForCells: true,
            enableForHeaderCells: false,
            maxToolTipLength: null
        };

        /**
         * Initialize plugin.
         */
        function init(grid) {
            options = $.extend(true, {}, _defaults, options);
            _grid = grid;
            if (options.enableForCells) _grid.onMouseEnter.subscribe(handleMouseEnter);
            if (options.enableForHeaderCells) _grid.onHeaderMouseEnter.subscribe(handleHeaderMouseEnter);
        }

        /**
         * Destroy plugin.
         */
        function destroy() {
            if (options.enableForCells) _grid.onMouseEnter.unsubscribe(handleMouseEnter);
            if (options.enableForHeaderCells) _grid.onHeaderMouseEnter.unsubscribe(handleHeaderMouseEnter);
        }

        /**
         * Handle mouse entering grid cell to add/remove tooltip.
         * @param {jQuery.Event} e - The event
         */
        function handleMouseEnter(e) {
            var cell = _grid.getCellFromEvent(e);
            if (cell) {
                var item = _grid.getDataItem(cell.row);
                var column = _grid.getColumns()[cell.cell];
                if (column.toolTip == null) {
                    return;
                }
                var $node = $(_grid.getCellNode(cell.row, cell.cell));
                if (typeof column.toolTip === "function") {
                    $node.attr("title", column.toolTip(cell.row, cell.cell, item, column));
                } else {
                    $node.attr("title", column.toolTip);
                }
            }
        }

        /**
         * Handle mouse entering header cell to add/remove tooltip.
         * @param {jQuery.Event} e     - The event
         * @param {object} args.column - The column definition
         */
        //todo/kn.. adjust this part yet
        function handleHeaderMouseEnter(e, args) {
            var column = args.column,
                $node = $(e.target).closest(".slick-header-column");
            if (column && !column.toolTip) {
                $node.attr("title", ($node.innerWidth() < $node[0].scrollWidth) ? column.name : "");
            }
        }

        // Public API
        $.extend(this, {
            "init": init,
            "destroy": destroy
        });
    }
})(jQuery);