var model = {

    shipPositioned: 0,

    placeShip: function(id){
        var id=$(this).find('div:first').attr('id');
        var nShips=$('#nShips').val();
        var width=$('#nShips').val();
        var col = (parseInt(id)/10) % 1;
        var row = Math.floor(parseInt(id)/10);
        var otherId=""+row+(col+1);

        if($(this).attr('class') != 'hit'){
            console.log(model.shipPositioned<nShips);
            if(model.shipPositioned<nShips && col<width){
                $('#'+id).attr('class', 'hit');
                $('#'+otherId).attr('class', 'hit');
                model.shipPositioned++;
            }
        }
        
    }

}

$(document).on('click', 'td', model.placeShip);