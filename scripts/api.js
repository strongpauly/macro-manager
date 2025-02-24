// DOCS: https://foundryvtt.com/api/v10/classes/client.Dialog.html
class MacroManagerDialog extends Dialog {
  constructor(arg1, arg2, clickHandlers) {
    super(arg1, arg2)
    this.clickHandlers = clickHandlers;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    Object.keys(this.clickHandlers).forEach(selector => {
      const button = html.find(selector);
      button.on('click', this.clickHandlers[selector]);
    })
  }
}

export class mm {

  static async openMacroManager( managerID ) {
    const persistent = game.settings.get("macro-manager", `0${managerID}persistent`);
    const title = game.settings.get("macro-manager", `0${managerID}title`);
    const macroList = game.settings.get("macro-manager", `0${managerID}macros`);  
    const compendiumList = game.settings.get("macro-manager", `0${managerID}sourcelist`);
    const sourceFlag = compendiumList.length>0; // false: world or true: compendium
    const data = {
      "macroList": macroList,
      "title": title,
      "persistent": persistent
    };  

    if (sourceFlag) {
      data["compendiumList"] = compendiumList;
      this.openCompendiumMacroManager( data );
    } else {
      this.openCustomMacroManager( data );
    }
  } // END openMacroManager   

  /*  
    const data = {
    "macroList": "macro 1; macro 2",
    "title": "title",
    "persistent": false,
    "macros": "[]"
    }   
  */ 
  static async openCustomMacroManager( args ) {  
    const dialogWidth =  game.settings.get("macro-manager", "dialogwidth");
    const dialogTransparency = game.settings.get("macro-manager", "dialogtransparency");
    const headerColor = game.settings.get("macro-manager", "headercolor");    
    const backgroundHeaderColor = game.settings.get("macro-manager", "backgroundheadercolor");        
    const maxButtonSize = dialogWidth - 40;
    const myDialogOptions = {classes: [ "macro-manager-dialog" ]}; // Dialog Options
    if (dialogTransparency) myDialogOptions.classes.push("macro-manager-dialog-transparent") ;
    myDialogOptions['width'] = dialogWidth;
    //myDialogOptions['resizable'] = true;
    
    // styles
    const templateName = game.settings.get("macro-manager", "theme");
    //const templateName = 'button_cyberpunk'; // tests
    const fontSize = game.settings.get("macro-manager", "fontsize");
    
    let macros = this.stringListToArray( args.macroList );

    let buttons = [], dialog;

    if ( game.settings.get("macro-manager", "sortmacros") ) macros = macros.sort(); // SORT

    for (const macroLabel of macros) {
      let templateData;
      const headerFrag = macroLabel.includes("##");

      let macro;
      if (args.macros!==undefined) {
        macro = args.macros.find(p=>p.name==macroLabel);
      } else {
        macro = game.macros.getName(macroLabel); // Macro in the world
      }
      
      if( !macro && !headerFrag ) continue;

      const buttonClass = macroLabel.replaceAll(' ', "_").toLowerCase()
      const classList = [buttonClass];

      if(macro.flags['macro-manager']?.selected) {
        classList.push("selected")
      }

      const selector = `button.${buttonClass}`

      if (headerFrag) {
        const headerImage = 'icons/sundries/books/book-red-exclamation.webp';
        const headerText = macroLabel.replace('##', '').replace('##', '');
        templateData = { icon: headerImage, labelText: headerText, labelFontSize: fontSize, header: headerFrag, maxButtonSize: maxButtonSize, headerColor: headerColor, backgroundHeaderColor: backgroundHeaderColor }; 
        const buttonTemplate = await renderTemplate( `modules/macro-manager/templates/${templateName}.html`, templateData );                
        buttons.push({
          selector,
          classList,
          content: buttonTemplate,
          callback: () => {
            if (!args.persistent) dialog.close()
          }
        });
      } else {
        templateData = { icon: macro.img, labelText: macroLabel, labelFontSize: fontSize, header: headerFrag, maxButtonSize: maxButtonSize }; 
        const buttonTemplate = await renderTemplate( `modules/macro-manager/templates/${templateName}.html`, templateData );        
        buttons.push({
          selector,
          classList,
          content: buttonTemplate,
          callback: () => {    
            this.macroRun(macro);
            if (!args.persistent) dialog.close()
          }
        }); 
      }
    }; // END FOR OF 
    dialog = new MacroManagerDialog({
        title: `${args.title}`, 
        buttons: {},
        content: `<div>${buttons.map(button => `<button class="${button.classList.join(" ")}">${button.content}</button>`).join('')}</div>`
      }, 
      myDialogOptions, 
      buttons.reduce((handlers, button)=> {
        handlers[button.selector] = button.callback
        return handlers;
      }, {})).render(true);
  } // END openMacroManager   

/*  
    const data = {
      "macroList": "macro 1; macro 2",
      "title": "title",
      "persistent": false,
      "compendiumList": "macro 1; macro 2",
    }   
*/   
  static async openCompendiumMacroManager( args ) {
    // Compendium    
    const compendiums = this.stringListToArray(args.compendiumList);
    let macros = [];
    // Get all macros from all compendiums
    for (const compendiumLabel of compendiums) {      
      const compendium = game.packs.find(p=>p.metadata.label==compendiumLabel);
      if (!compendium) { 
        ui.notifications.error(game.i18n.format(`macro-manager.messages.compendiumNotFound`, { message: compendiumLabel })); 
        return; 
      }
      const compendiumMacros = await compendium.getDocuments();
      for (const compendiumMacro of compendiumMacros) {
        macros.push(compendiumMacro); // get it with:  macros.find(p=>p.name=='Macro Manager 1')
      }
    }    
    //game.i18n.format(`${moduleName}.messages.compendiumNotFound`, { message: compendiumLabel })
    const data = {
      "macroList": args.macroList,
      "title": args.title,
      "persistent": args.persistent,
      "macros": macros
    };   
    this.openCustomMacroManager(data);    

  } // END openMacroManager   
  
  // ---------------------------------------------------------------
  // Tools
  static showSummary() {
    let titleContent = `<h2><img style="border: 0;vertical-align:middle;" src="icons/sundries/documents/document-sealed-signatures-red.webp" width="28" height="28"> Macro Manager Summary</h2>`;
    let message = ``;
  
    let numbers = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];
    for ( const currentNumber of numbers ) {
      const title = game.settings.get("macro-manager", currentNumber + `title`);
      const macroList = this.stringListToArray(game.settings.get("macro-manager", currentNumber + `macros`));
      if ( game.settings.get("macro-manager", currentNumber + `macros`).length>0 ) {        
        message += `<details>`;            
        message += `<summary>${title} (click to expand)</summary>`;      

        message += `<ul>`;      
        for ( const item of macroList ) {
          message += `<li>${item}</li>`;
        }      
        message += `</ul>`;      
        
        message += `</details>`;
      } // END IF
    }

    let chatData = {
      speaker: null,
      whisper : ChatMessage.getWhisperRecipients("GM"),
      content: `
      ${titleContent}
      ${message}
      `};
    ChatMessage.create(chatData, {});    
  }
  
  static async getAllMacroLabelsFromCompendium() {
    const compendiums = await game.packs.filter(p=>p.metadata.type=='Macro');
    let compendiumsList = '';
    for (const compendium of compendiums) {
      compendiumsList += `<option value="${compendium.metadata.name}">${compendium.metadata.label}</option>`
    }    

    let template = `  
      <h2 style="font-align: center;">Get All Macros Labels!</h2>
      <div>
        <b>Compendium (Choose):</b> 
        <select id="compendium" type="text">
          ${compendiumsList}
        </select>  
      </div>
      </br>
    `;
    new Dialog({
      title: "Get All Macros Names",
      content: template,
      buttons: {
        ok: {
          label: "Generate",
          callback: async (html) => {
            let compendium = html.find("#compendium")[0].value;
            const allMacros = await game.packs.find(p=>p.metadata.name==compendium).getDocuments();
            const macros = allMacros.filter(p=>p.type=='script');
            let template = '';
            for (const macro of macros) {
              template += `${macro.name};`
            }               

            /* view */
            let form = `
              <label>Copy this to Settings</label>
              <textarea id="moduleTextArea" rows="5" cols="33">${template}</textarea>
            `;

            let dialog = new Dialog({
              title: "Macros",
              content: form,
              buttons: {
                use: {
                  label: "Copy to Clipboard",
                  callback: () => {
                    let copyText = document.getElementById("moduleTextArea"); /* Get the text field */  
                    copyText.select(); /* Select the text field */  
                    document.execCommand("copy"); /* Copy the text inside the text field */  
                    ui.notifications.notify(`Saved on Clipboard`); /* Alert the copied text */
                  }
                }
              }
            }).render(true); 
      
          } // END CALLBACK
        }
      }
    }).render(true);    

  }
  
  static tools(stringList) {
    const macroList = "Summary; Get All Macro Names From Compendium;Documentation";
    const compendiumList = "Macro Manager";
    const data = {
      "macroList": macroList,
      "title": "Tools for Macro Manager",
      "persistent": false,
      "compendiumList" : compendiumList
    }
    this.openCompendiumMacroManager( data );  
  }
  
  // ---------------------------------------------------------------
  // Helpers stringListToArray 
  static stringListToArray(stringList) {
    stringList = stringList.split(';'); 
    const arrayList = stringList.map(element => {
      return element.trim();
    });        
    return arrayList.filter(n => n.length>0); // remove empty
  }

  // ---------------------------------------------------------------
  // Macros
  static async macroRun(macro) {  
    /* CHECK
      const pack = game.packs.get("mymodule.mypack");
      const macro = pack.getDocument(documentId);
      await macro.execute();
    */
    // Get the data from the macro in the compendium in a JS object form
    let macro_data = macro.toObject();
    let temp_macro = new Macro(macro_data);
    temp_macro.ownership.default = 3;
    await temp_macro.execute();
  }
  
} // END CLASS