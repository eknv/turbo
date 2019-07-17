

/**
 * getting the selected rows
 * getting the row of the cell being clicked on
 * changing the selection
 */
gridObject.onClick.subscribe(function (e) {
  if (!gridObject.getEditorLock().commitCurrentEdit()) {
    return;
  }
  if (gridObject.getSelectedRows() == null || gridObject.getSelectedRows()[0] == null) {
    return;
  }
  var selectedRow = gridObject.getSelectedRows()[0];
  var currentRow = gridObject.getCellFromEvent(e).row;
  if (currentRow == selectedRow) {
    setTimeout(function () {
      gridObject.setSelectedRows([]);
    }, 10);
  }
});




