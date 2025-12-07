import React from "react";
import { BiX, BiShare, BiTrash } from "react-icons/bi";

const SelectionHeader = ({
  selectedCount,
  onForward,
  onDelete,
  onExitSelection,
}) => {
  return (
    <>
      <div className="backAccountBox">
        <div className="back" onClick={onExitSelection}>
          <BiX />
        </div>
        <div className="account">
          <div className="right">
            <div className="name">{selectedCount} выбрано</div>
          </div>
        </div>
      </div>
      <div className="otherButtons">
        <span onClick={onForward}>
          <BiShare />
        </span>
        <span onClick={onDelete}>
          <BiTrash />
        </span>
      </div>
    </>
  );
};

export default React.memo(SelectionHeader);
