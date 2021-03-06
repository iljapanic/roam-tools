import { Remarkable } from "remarkable";
var md = new Remarkable({ breaks: true });

md.inline.ruler.enable(["ins", "mark", "sub", "sup"]);

function setSelectValue(id, value, set_to_default = false) {
  const $target = $("#" + id);

  if ($target.length === 0) {
    //dont recognize this id
    return;
  }

  const options = [...$target.get(0).options];

  if (!!set_to_default) {
    value = $target.data("default").toString();
  }
  let currentValue = $target.val();
  let maxIterations = value === null ? 1 : options.length;
  let iterationCount = 0;
  let newSelectedIndex;

  while (currentValue !== value) {
    iterationCount += 1;
    const selectedIndex = $target.get(0).selectedIndex;

    newSelectedIndex = selectedIndex + 1;
    if (newSelectedIndex > options.length - 1) {
      newSelectedIndex = 0;
    }
    $target.prop("selectedIndex", newSelectedIndex);
    currentValue = $target.val();
    if (iterationCount >= maxIterations) {
      //we looped around and didnt find the target value, so stop
      break;
    }
  }

  $target.closest("div.setting").removeClass("selected");
  $target.closest("div.setting").removeClass("all");
  $target.closest("div.setting").removeClass("zero");
  $target.closest("div.setting").removeClass("one");
  $target.closest("div.setting").removeClass("two");
  $target.closest("div.setting").removeClass("three");
  if (currentValue === "true") {
    $target.closest("div.setting").addClass("selected");
  } else if (currentValue === "999") {
    $target.closest("div.setting").addClass("all");
  } else if (currentValue === "0") {
    $target.closest("div.setting").addClass("zero");
  } else if (currentValue === "1") {
    $target.closest("div.setting").addClass("one");
  } else if (currentValue === "2") {
    $target.closest("div.setting").addClass("two");
  } else if (currentValue === "3") {
    $target.closest("div.setting").addClass("three");
  }

  var searchParams = new URLSearchParams(window.location.search);
  if (newSelectedIndex === 0) {
    searchParams.delete($target.attr("id"));
  } else {
    searchParams.set($target.attr("id"), currentValue);
  }
  var newRelativePathQuery =
    window.location.pathname + "?" + searchParams.toString();
  history.pushState(null, "", newRelativePathQuery);
}

$(document).ready(function() {
  $("label.toggle-on-click").on("click", function(e) {
    const $target = $(e.target).find("select");
    if (!$target.length) {
      return;
    }
    setSelectValue($target.attr("id"), null);

    render();
  });

  $("#input").on("change keyup", render);

  $(".reset-options").on("click", function() {
    $(".hidden-select-setting").each(function(idx, ele) {
      const $target = $(ele);
      setSelectValue($target.attr("id"), null, true);
    });
    history.pushState(null, "", window.location.pathname);
    render();
  });

  const urlParams = new URLSearchParams(window.location.search);
  urlParams.forEach(function(value, key) {
    setSelectValue(key, value);
  });

  render();
});

function render() {
  const settings = {
    flatten_indentation: Number($("#flatten-indentation").val()),
    remove_bullets: $("#remove-bullets").val() === "true",
    remove_double_brackets: $("#remove-double-brackets").val() === "true",
    remove_double_braces: $("#remove-double-braces").val() === "true",
    remove_formatting: $("#remove-formatting").val() === "true",
    add_line_breaks: Number($("#add-line-breaks").val()),
    remove_colon_from_attributes:
      $("#remove-colon-from-attributes").val() === "true",
    remove_quotes: $("#remove-quotes").val() === "true",
    remove_hashtag_marks: $("#remove-hashtag-marks").val() === "true",
    hide_settings: $("#hide-settings").val() === "true",
    remove_todos: $("#remove-todos").val() === "true",
    remove_namespaces: $("#remove-namespaces").val() === "true",
    export_latex: $("#export-latex").val() === "true"
  };

  if (isNaN(settings.add_line_breaks)) {
    settings.add_line_breaks = 0;
  }

  //console.log(settings);

  const input = $("#input").val();
  let result = input;
  let latexResult;

  result = addLineBreaksBeforeParagraphs(result, settings.add_line_breaks);

  if (settings.flatten_indentation) {
    result = flattenIndentation(result, settings.flatten_indentation);
  }

  if (settings.remove_bullets) {
    result = removeBullets(result);
  }

  if (settings.remove_double_braces) {
    result = removeDoubleBraces(result);
  }

  if (settings.remove_todos) {
    result = removeTodos(result);
  }

  result = convertTodoAndDone(result);

  if (settings.remove_namespaces) {
    result = removeNamespaces(result);
  }

  if (settings.remove_double_brackets) {
    result = removeDoubleBrackets(result);
  }

  if (settings.remove_colon_from_attributes) {
    result = removeColonFromAttributes(result);
  }

  if (settings.remove_quotes) {
    result = removeQuotes(result);
  }

  if (settings.remove_hashtag_marks) {
    result = removeHashtagMarks(result);
  }

  if (settings.remove_formatting) {
    result = removeFormatting(result);
  }

  if (settings.export_latex) {
  	latexResult = renderLatex(result);
  }

  if (settings.hide_settings) {
    hideSettings();
  } else {
    showSettings();
  }

	if (settings.export_latex) {
		$("#output").val(latexResult);

		$("#rendered-output").html(`LaTeX only output, see above
<a href="data:application/x-latex;base64,${btoa(latexResult)}" download="roam-tools-latex-export.tex">download latex file</a
		`);
	} else {
		$("#output").val(result);

		$("#rendered-output").html(
			md.render(convertForMarkdown(result), {gfm: true}) + `<br />`
		);
	}
  //$("#rendered-output").html(`<pre>` + convertForMarkdown(result) + `</pre>`);
}

function convertForMarkdown(input) {
  return input
    .split("\n")
    .map(function(line) {
      return line.replace(/__/gm, `_`);
    })
    .map(function(line) {
      return line.replace(/\^\^(.+)\^\^/gm, `==$1==`);
    })
    .map(function(line) {
      return line.replace(/\b(.+\:\:)/gm, `**$1**`);
    })
    .map(function(line) {
      if (line.trim().startsWith("- ")) {
        return line;
      } else {
        return line.replace(/\s\s\s\s/gm, "&nbsp;&nbsp;&nbsp;&nbsp;");
      }
    })
    .join("\n");
}

function convertTodoAndDone(input) {
  return input
    .split("\n")
    .map(function(line) {
      return line.replace("{{[[TODO]]}}", "☐").replace("{{[[DONE]]}}", "☑︎");
    })
    .join("\n");
}

function removeTodos(input) {
  return input
    .split("\n")
    .map(function(line) {
      return line
        .replace(/\{\{\[\[TODO\]\]\}\}\s?/, "")
        .replace(/\{\{\[\[DONE\]\]\}\}\s?/, "");
    })
    .join("\n");
}

function addLineBreaksBeforeParagraphs(input, numberOfLineBreaks) {
  return input
    .split("\n")
    .map(function(line, index) {
      //dont add line breaks before the first paragraph
      if (index > 0 && numberOfLineBreaks > 0 && line.trimStart() === line) {
        return "\n".repeat(numberOfLineBreaks) + line;
      }
      return line;
    })
    .join("\n");
}

function flattenIndentation(input, flatten_indentation) {
  if (flatten_indentation > 5) {
    return input
      .split("\n")
      .map(function(line) {
        return line.trimStart();
      })
      .join("\n");
  } else {
    let output = input;
    for (let idx = 0; idx < flatten_indentation; idx++) {
      output = output
        .split("\n")
        .map(function(line) {
          return line.replace(/^\s\s\s\s(.+)/gm, "$1");
        })
        .join("\n");
    }
    return output;
  }
}

function removeBullets(input) {
  return input
    .split("\n")
    .map(function(line) {
      return line.replace(/^(\s*)-\s/gm, "$1");
    })
    .join("\n");
}

function removeColonFromAttributes(input) {
  return input
    .split("\n")
    .map(function(line) {
      return line.replace(/\b(.+)\:\:/gm, "$1:");
    })
    .join("\n");
}

function removeQuotes(input) {
  return input
    .split("\n")
    .map(function(line) {
      return line.replace(/\"(.+)\"/gm, "$1");
    })
    .join("\n");
}

function removeHashtagMarks(input) {
  return input
    .split("\n")
    .map(function(line) {
      return line.replace(/\#(.+)\b/gm, "$1");
    })
    .join("\n");
}

function removeDoubleBraces(input) {
  return input
    .split("\n")
    .map(function(line) {
      return line.replace(/\{\{([^\{\}]+)\}\}/gm, "$1");
    })
    .join("\n");
}

function removeNamespaces(input) {
  const result = input
    .split("\n")
    .map(function(line) {
      return line.replace(/\[\[(.+?)\/(.+?)\]\]/gm, "[[$2]]");
    })
    .join("\n");

  const matches = [...result.matchAll(/\[\[(.+?)\/(.+?)\]\]/gm)];
  if (matches.length > 0) {
    return removeNamespaces(result);
  }
  return result;
}

function removeDoubleBrackets(input) {
  const result = input
    .split("\n")
    .map(function(line) {
      return line
        .replace(/\[([^\[\]]+)\]\((\[\[|\(\()([^\[\]]+)(\]\]|\)\))\)/gm, "$1")
        .replace(/\[\[([^\[\]]+)\]\]/gm, "$1")
        .replace(/\(\(([^\(\)]+)\)\)/gm, "$1");
    })
    .join("\n");

  const matches = [
    ...result.matchAll(/\[([^\[\]]+)\]\((\[\[|\(\()([^\[\]]+)(\]\]|\)\))\)/gm),
    ...result.matchAll(/\[\[([^\[\]]+)\]\]/gm),
    ...result.matchAll(/\(\(([^\(\)]+)\)\)/gm)
  ];
  if (matches.length > 0) {
    return removeDoubleBrackets(result);
  }
  return result;
}

function removeFormatting(input) {
  return input
    .split("\n")
    .map(function(line) {
      return line
        .replace(/\*\*(.+?)\*\*/gm, "$1")
        .replace(/\_\_(.+?)\_\_/gm, "$1")
        .replace(/\^\^(.+?)\^\^/gm, "$1");
    })
    .join("\n");
}

function hideSettings() {
  const parentDiv = document.querySelector("div.parent");
  parentDiv.style.gridTemplateColumns = "0 repeat(2, 1fr)";
  const settignsContainer = document.querySelector("div.settings-container");
  settignsContainer.style.display = "none";
}

function showSettings() {
  const parentDiv = document.querySelector("div.parent");
  parentDiv.style.gridTemplateColumns = null;
  const settignsContainer = document.querySelector("div.settings-container");
  settignsContainer.style.display = null;
}

function renderLatexLink(text) {
  // text = content of a Roam link.
  // return: latex rendering.

  // We only map those links to citations that satisfy the standard bibtex key format, i.e.:
  // Schuldenzucker2020default OR
  // schuldenzucker2020
  // This is generated by Google Scholar, for instance.
  // Any other link is just rendered as regular text.
  // If you want to render *all* links as citations instead, comment out the following lines:
  if (!text.match(/^[a-zA-Z]+[0-9]+[a-zA-Z]*$/)) {
    // If you want to render non-citation links with double brackets instead, use:
    // return `[[${text}]]`
    return text;
  }

  return `\\cite{${text}}`;
}

function replaceMarkupVia(text, rx, f_via) {
  // replace all inner instances of rx matches by their f_via result.
  const chunks = text.split(rx);
  for (let i = 1; i < chunks.length; i += 2) {
    chunks[i] = f_via(chunks[i]);
  }
  return chunks.join("");
}

function renderLatex(input) {
  let output = "";

  // the following vars: to track indent levels for paragraph breaks.
  // (this one is a bit weird)
  let section_indent = undefined; // indent level of most recent section header
  let par_indent = undefined; // indent level of start of paragraph

  for (let line of input.split("\n")) {
    // detect & remove indentation level & bullet symbol
    let indent = line.match(/^ */)[0].length;
    line = line.replace(/^ *(- )?/, "");

    // detect & replace section headers
    let isSection = /^#/.test(line);
    if (isSection) {
      section_indent = indent;
      par_indent = undefined;
    }
    if (!isSection && par_indent === undefined) {
      // previous line was a section header
      par_indent = indent;
    }
    line = line.replace(/^# (.*)/, "\n\\section{$1}");
    line = line.replace(/^## (.*)/, "\n\\subsection{$1}");
    line = line.replace(/^### (.*)/, "\n\\subsubsection{$1}");

    // replace italic/bold markup
    line = replaceMarkupVia(line, /__/g, text => `\\emph{${text}}`);
    line = replaceMarkupVia(line, /\*\*/g, text => `\\textbf{${text}}`);
    // remove highlight (currently not doing anything with this)
    line = line.replace(/\^\^/g, "");

    // replace latex
    line = line.replace(/\$\$/g, "$");

    // replace page links
    // KNOWN BUG: Nested page links and links containing ']' don't work.
    line = line.replace(/\[\[([^\]]*)\]\]/g, function(
      match,
      linktext,
      offset,
      string,
      groups
    ) {
      return renderLatexLink(linktext);
    });

    // output
    if (indent <= par_indent) {
      output += "\n";
      par_indent = indent;
    }

    output += line + "\n";
  }
  return output;
}
