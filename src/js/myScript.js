var model = {

    shipPositioned: 0,

    placeShip: function(id){
        var id=$(this).find('div:first').attr('id');
        var nShips=$('#nShips').val();
        var width=$('#tableWidth').val();
        var col = id.split('-')[1];
        var row = id.split('-')[0];
        var _temp=parseInt(col)+1;
        var otherId=""+row+"-"+(_temp);

        if($('#'+id).attr('class') != 'hit'){
            console.log(model.shipPositioned<nShips);
            if(model.shipPositioned<nShips && parseInt(col)<width){
                $('#'+id).attr('class', 'hit');
                $('#'+otherId).attr('class', 'hit');
                model.shipPositioned++;
            }
        }
        
    },

    makeMove: function(id){
        var idRaw=$(this).find('div:first').attr('id');
        var id=idRaw.substring(1);

        var table=document.getElementById("adversaryBoard");
        for (var i = 1, row; row = table.rows[i]; i++) {
            for (var j = 1, col; col = row.cells[j]; j++) {
                if(col.firstChild.getAttribute("class") == 'redB')
                    col.firstChild.removeAttribute("class");
            }  
        }

        if($('#a'+id).attr('class') != 'hit' && $('#a'+id).attr('class') != 'miss'){
            $('#a'+id).attr('class', 'redB');
        }
    }

}

$(document).on('click', '.mine', model.placeShip);
$(document).on('click', '.him', model.makeMove);