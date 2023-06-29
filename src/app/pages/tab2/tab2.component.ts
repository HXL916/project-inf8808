import { Component, OnInit,AfterViewInit } from '@angular/core';
import * as d3 from 'd3';
import * as waffle from 'src/app/pages/tab2/waffle';
import * as waffle1 from 'src/app/pages/tab1/waffle';
import { PreprocessingService } from 'src/app/services/preprocessing.service';
import { partyColorScale, genderColorScale, getColorScale } from "../../utils/scales"
import * as preproc from './preprocessTab2'


@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.component.html',
  styleUrls: ['./tab2.component.css']
})
export class Tab2Component  implements OnInit    {
  colorScale!: any;
  wantedKey:string;
  wantedLegislature:number;
  
  
  constructor(private preprocessingService: PreprocessingService) {
    this.wantedKey = "genre";
    this.wantedLegislature = 44;
    this.colorScale = genderColorScale;

  }

  async ngOnInit() { 
    try {
      await this.preprocessingService.isInitialized().toPromise();
      this.updateView();
    } catch (error) {
      console.error(
        'Error while initializing preprocessingService on tab3: ',
        error
      );
    }
  }

  updateWantedKey(key:string):void{
    this.wantedKey=key;
    this.updateView();
  }
  updateWantedLegislature(event: Event) {
    this.wantedLegislature=Number((event.target as HTMLInputElement).value);
    this.updateView();
  }
  async updateView():Promise<void>{         //importer data une fois seulment à place de le refaire à chaque changement
    await this.createGraph(this.process(this.preprocessingService.sortedData[this.wantedLegislature]));
    const count : { [key:string]: number } = this.preprocessingService.getCountByKey(this.preprocessingService.sortedData[this.wantedLegislature], this.wantedKey)
    this.addCountToLegend(count)
  }

  /**
 * Keeps only the MPs from the selected Legislature.
 *
 * @param {object[]} data The data to analyze
 * @returns {object[]} output The data filtered
 */
  process(data: { [key: string]: any }[]):{ [key: string]: any }[]{
    switch (this.wantedKey){
      case "genre":
        this.colorScale = genderColorScale;
        break;
      case "parti":
        //let affiliations = this.preprocessingService.getPartiesNames(data);
        this.colorScale = partyColorScale//d3.scaleOrdinal().domain(affiliations).range(["#159CE1","#AAAAAA","#FF8514","#002395","#ED2E38","#30D506"]);
        break;
      case "province":
        let provinces = [... new Set(data.map(obj => obj["province"]))].sort();
        this.colorScale = getColorScale(provinces)//d3.scaleOrdinal().domain(provinces).range(d3.schemeTableau10);
        break;
    } 

    return data.sort((x, y) => d3.ascending(x[this.wantedKey], y[this.wantedKey]));
  }


/**
 * Draws the waffle chart
 *
 * @param {object[]} data The data to use
 */
  async createGraph(data: { [key: string]: any }[]): Promise<void> {
    // Draw each seat 
    await waffle.drawSquares(data, '#graph-container',this.colorScale,this.wantedKey);

    // Rearrange the seats to make it looks more like the house 
    this.lookLikeHouseOfCommons();
    await waffle1.drawWaffleLegend(this.colorScale);
         
  }

  /**
 * Rearrange the waffle chart to git it the looks of the House Of Commons, with an alley in the middle
 */
  lookLikeHouseOfCommons(nbBlocCol = 4,nbBlocRow = 5):void{
    let bigGap = 10,
        alleyGap = 20;
    
    // Improve placement of the squares
    for (let i=0;i<nbBlocCol;i++){
      for (let j=0;j<Math.floor(nbBlocRow/2);j++){
        d3.selectAll("rect[col='"+String(i)+"'][row='"+String(j)+"']")
        .attr('transform','translate('+String(bigGap*i)+','+String(bigGap*j)+')');
      }
      for (let j=Math.floor(nbBlocRow/2);j<nbBlocRow;j++){
        d3.selectAll("rect[col='"+String(i)+"'][row='"+String(j)+"']")
        .attr('transform','translate('+String(bigGap*i)+','+String(alleyGap+bigGap*j)+')');
      }
    }
  }

  // Ajoute à la légende le nombre de députés dans chaque groupe / le nombre total de députés pour cette législature
  addCountToLegend(countData: { [key:string]: number }):void{
    let total:number = 0;
    for (const key in countData) {
      if (countData.hasOwnProperty(key)) {
        const value = countData[key];
        total += value;
      }
    }
    const gElements = d3.select("#legendContainer").select(".legend").selectAll(".cell")
    // Update the text within each <text> element
    gElements.each(function () {
      const textElement = d3.select(this).select('text')
      const keyText = textElement.text()
      if(countData.hasOwnProperty(keyText)){
        const newText = `${keyText} (${countData[keyText]}/${total})`
        textElement.text(newText)
      }
      else{
        const newText = `${keyText} (0/${total})`
        textElement.text(newText)
      }
    })
    }


  
}
