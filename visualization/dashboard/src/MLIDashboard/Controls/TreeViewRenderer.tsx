import React from "react";
import { select } from 'd3-selection'
import { stratify as d3stratify, tree as d3tree, HierarchyPointNode } from 'd3-hierarchy'
import { scaleLinear as d3scaleLinear, InterpolatorFactory } from 'd3-scale'
import { interpolateHcl as d3interpolateHcl } from 'd3-interpolate'
import { rgb as d3rgb } from 'd3-color'
import { max as d3max } from 'd3-array'
import { IExplanationContext, ModelTypes } from "../IExplanationContext";
import { IBarChartConfig, FeatureKeys, FeatureSortingKey } from "../SharedComponents/IBarChartConfig";
import { HelpMessageDict } from "../Interfaces";
import { RefObject } from "office-ui-fabric-react/lib/Utilities";
import { CSSTransition, TransitionGroup } from 'react-transition-group';

// Importing this solely to set the selectedPanelId. This component is NOT a statefulContainer
// import StatefulContainer from '../../ap/mixins/statefulContainer.js'

require('./TreeViewRenderer.css');

export interface ITreeViewRendererProps {
    explanationContext: IExplanationContext;
    theme?: string;
    messages?: HelpMessageDict;
    treeNodes: Array<any>;
}

export interface ITreeViewRendererState {
}

export interface Transform {
    transform: string
}

export interface ShowSelectedStyle {
    opacity: number
}

export interface ErrorColorStyle {
    fill: string
}

export interface NodeDetail {
    showSelected: ShowSelectedStyle,
    globalError: any,
    localError: any,
    instanceInfo: string,
    errorInfo: string,
    successInfo: string,
    errorColor: ErrorColorStyle,
    mask_down: Transform,
    mask_up: Transform
}

export interface TreeNode {
    id: string,
    parent: any,
    r: number,
    error: number,
    data: any,
    // size: d.size,
    highlight: boolean,
    hoverText: any,
    errorColor: any,
    maskShift: any,
    style: any,
    error_style: any,
    fillstyle_up: any,
    fillstyle_down: any
}

const SvgOuterFrame: React.RefObject<SVGSVGElement> = React.createRef();

export class TreeViewRenderer extends React.PureComponent<ITreeViewRendererProps, ITreeViewRendererState> {
    // private SvgOuterFrameRef: React.RefObject<SVGSVGElement>;
    private treeNodes: Array<any>;
    constructor(props:ITreeViewRendererProps) {
        super(props);
        this.treeNodes = props.treeNodes
        this.onResize()
    }
    root: HierarchyPointNode<any> = null;
    nodeData: Array<TreeNode> = null;
    linkData: any = null;
    linkLabelData: any = null;
    // LEGACY...
    viewerWidth: any = null;
    viewerHeight: any = null;
    rootSize: any = 0;
    rootErrorSize: any = 0;
    rootLocalError: any = 0;
    errorAvgColor: any = '#b2b7bd';
    errorRatioThreshold: any = 1.0;
    selected: any = null;
    selected_node: any = null;
    nodeDetail: NodeDetail = {
      showSelected: { opacity: 0 },
      globalError: 42,
      localError: 24,
      instanceInfo: '0 Instances',
      errorInfo: '0 Errors',
      successInfo: '0 Success',
      errorColor: {
          fill: '#eaeaea',
      },
      mask_down: {
          transform: `translate(0px, -13px)`,
      },
      mask_up: {
          transform: `translate(0px, 13px)`,
      },
    };
    colorgrad: any = null;
    svg: any = null;
    temp: any = null;

    public render(): React.ReactNode {
        this.reloadData()
        if (!this.root) return
  
        const labelPaddingX = 20
        const labelPaddingY = 8
        const labelYOffset = 3
  
        const min = this.rootErrorSize / this.rootSize
        const max = d3max(this.root.descendants(), d => d.data.error / d.data.size)
  
        this.colorgrad = d3scaleLinear()
          .domain([min, max])
          .interpolate(d3interpolateHcl as unknown as InterpolatorFactory<number, string>)
          .range([d3rgb('#F4D1D2').r, d3rgb('#8d2323').r])
  
        // GENERATES LINK DATA BETWEEN NODES
        // -------------------------------------------------------------------
        this.linkData = this.root
          .descendants()
          .slice(1)
          .map(d => {
            const thick = 1 + Math.floor(30 * (d.data.size / this.rootSize))
            const lineColor = d.data.isSelected ? '089acc' : 'e8eaed'
            return {
              id: d.id + Math.random(),
              d: `M${d.x},${d.y}L${d.parent.x},${d.parent.y}`,
              style: {"strokeWidth": thick, "stroke": lineColor}
            }
          })
        var links = this.linkData
  
        // GENERATES THE LINK LABEL DATA FOR THE SELECTED PATH
        // -------------------------------------------------------------------
        this.linkLabelData = this.root
          .descendants()
          .slice(1)
          .filter(d => d.data.isSelected)
          .map(d => {
            const labelX = d.x + (d.parent.x - d.x) * 0.5
            const labelY = 4 + d.y + (d.parent.y - d.y) * 0.5
            const bb = this.getTextBB(d.data.nodeName)
            return {
              id: `linkLabel${d.id}`,
              text: `${d.data.nodeName}`,
              style: {
                transform: `translate(${labelX}px, ${labelY}px)`,
              },
              bbWidth: bb.width + labelPaddingX,
              bbHeight: bb.height + labelPaddingY,
              bbX: 0.5 * (bb.width + labelPaddingX),
              bbY: 0.5 * (bb.height + labelPaddingY) + labelYOffset,
            }
          })
        var linkLabels = this.linkLabelData
  
        // GENERTES THE ACTUAL NODE COMPONENTS AND THEIR INTERACTIONS
        // -------------------------------------------------------------------
        this.nodeData = this.root.descendants().map(d => {
          const globalErrorPerc = d.data.error / this.rootErrorSize
          const localErrorPerc = d.data.error / d.data.size
          const calcMaskShift = globalErrorPerc * 52
          const calcHoverText = `Error Rate: ${((d.data.error / d.data.size) * 100).toFixed(
            2
          )}%\r\nError Coverage: ${((d.data.error / this.rootErrorSize) * 100).toFixed(
            2
          )}%\r\nInstances: ${d.data.size}\r\n${d.data.pathFromRoot}${this.skippedInstances(d)}`
  
          let heatmapStyle = {"fill": this.errorAvgColor}
  
          if (d.data.error / d.data.size > this.rootLocalError * this.errorRatioThreshold) {
            heatmapStyle = {"fill": this.colorgrad(localErrorPerc)}
          }
  
          let selectedStyle: any = heatmapStyle
  
          if (d.data.isSelected) {
            let strokeWidth = {'strokeWidth': 3}
            selectedStyle = {strokeWidth, heatmapStyle}
          }
  
          return {
            id: d.id + Math.random(),
            // parentId: d.parentId,
            parent: d.parent,
            r: 28,
            error: 10,
            data: d.data,
            // size: d.size,
            highlight: false,
            hoverText: calcHoverText,
            errorColor: heatmapStyle,
            maskShift: calcMaskShift,
            style: {
              transform: `translate(${d.x}px, ${d.y}px)`,
            },
            error_style: selectedStyle,
            fillstyle_up: {
              fill: `#d2d2d2`,
              transform: `translate(0px, ${calcMaskShift}px)`,
            },
            fillstyle_down: {
              transform: `translate(0px, -${calcMaskShift}px)`,
            },
          }
        })
        var nodes = this.nodeData

        const detailsStyle = {
            transform: 'translate(0px, 5px)'
        }
        const opacityToggleStyle = {
            transform: 'translate(10px, 10px)'
        }
        const opacityToggleRectStyle = {
            transform: 'translate(-5px,-5px)'
        }
        const detailLinesStyle = {
            transform: 'translate(0px, 10px)'
        }
        const opacityToggleCircleStyle = {
            transform: 'translate(30px, 50px)'
        }
        const detailPercStyle = {
            transform: 'translate(0px,45px)'
        }
        const detailPercLabelStyle = {
            transform: 'translate(0px,55px)'
        }
        const nonOpacityToggleCircleStyle = {
            transform: 'translate(100px, 50px)'
        }
        const detailPerc2Style = {
            transform: 'translate(0px,45px)'
        }
        const detailPercLabel2Style = {
            transform: 'translate(0px,55px)'
        }

        return (
          <div className="mainFrame"> {/* v-size-changed={this.onResize} */}
            <svg ref={SvgOuterFrame} className="SvgOuterFrame" onClick={this.bkgClick.bind(this)}>
              <mask id="Mask">
                <rect x="-26" y="-26" width="52" height="52" fill="white" />
              </mask>
      
              {/* Legend */}
              <g name="details" style={detailsStyle} onClick={e => e.stopPropagation()}> {/* @click.stop */}
                <mask id="detailMask">
                  <rect x="-26" y="-26" width="52" height="52" fill="white" />
                </mask>
      
                <g name="opacityToggle" style={this.nodeDetail.showSelected}>
                  <g style={opacityToggleStyle}>
                    <rect
                      width="280"
                      height="140"
                      fill="transparent"
                      style={opacityToggleRectStyle}
                    />
                    <text
                      className="detailLines"
                      style={detailLinesStyle}
                    >{this.nodeDetail.instanceInfo} [ {this.nodeDetail.errorInfo} | {this.nodeDetail.successInfo} ]</text>
                    <g style={opacityToggleCircleStyle}>
                      <circle r="26" className="node" style={this.nodeDetail.errorColor} />
                      <g style={this.nodeDetail.mask_down} mask="url(#detailMask)" className="nopointer">
                        <circle r="26" className="node" fill="#d2d2d2" style={this.nodeDetail.mask_up} />
                      </g>
                      <text
                        className="detailPerc"
                        style={detailPercStyle}
                      >{this.nodeDetail.globalError}%</text>
                      <text
                        className="detailPercLabel"
                        style={detailPercLabelStyle}
                      >error coverage</text>
                    </g>
                    <g style={nonOpacityToggleCircleStyle}>
                      <circle r="26" className="node" style={this.nodeDetail.errorColor} />
                      <circle r="21" className="node" fill="#d2d2d2" />
                      <text
                        className="detailPerc"
                        style={detailPerc2Style}
                      >{this.nodeDetail.localError}%</text>
                      <text className="detailPercLabel" style={detailPercLabel2Style}>error rate</text>
                    </g>
                  </g>
                </g>
              </g>

              {/* Tree */}
              <TransitionGroup component="g" style={{transform: "translate(0px, 90px)"}}> {/*tag="g" name="lines" style="transform: translate(0px, 90px)"*/} 
                {/* <path v-for="link in links" key="link.id" d="link.d" style="link.style" /> */}
                {links.map(link => (
                    <CSSTransition key={link.id} in={true} timeout={200} className="links">
                        <path key={link.id} id={link.id} d={link.d} style={link.style} />
                    </CSSTransition>
                ))}
              </TransitionGroup>
              <TransitionGroup component="g" style={{transform: "translate(0px, 90px)"}}> {/*v-if="nodes" tag="g" name="nodes" style="transform: translate(0px, 90px)"*/}
                {nodes.map((node, index) => (
                    <CSSTransition key={node.id} in={true} timeout={200} className="nodes">
                        <g key={node.id} style={node.style} onClick={(e => this.select(index, node, e)).bind(this)}>
                            <circle r={node.r} className="node" style={node.error_style}/>

                            <g style={node.fillstyle_down} mask="url(#Mask)" className="nopointer">
                                <circle r="26" style={node.fillstyle_up} />
                            </g>
                            {/*TODO: not sure why text-anchor is not liked by browser*/}
                            <text textAnchor="middle" className="node_text" style={{transform: "translate(0px,0px)"}}>{node.data.error} / {node.data.size}</text>
                            <title>{node.hoverText}</title>
                        </g>
                    </CSSTransition>
                ))}
              </TransitionGroup>
              <TransitionGroup component="g" style={{transform: "translate(0px, 90px)"}}>
                {linkLabels.map(linkLabel => (
                    <CSSTransition key={linkLabel.id} in={true} timeout={200} className="linkLabels">
                        <g key={linkLabel.id} style={linkLabel.style}>
                            <rect
                                x={-linkLabel.bbX}
                                y={-linkLabel.bbY}
                                width={linkLabel.bbWidth}
                                height={linkLabel.bbHeight}
                                fill="white"
                                stroke="#089acc"
                                strokeWidth="1px"
                                rx="10"
                                ry="10"
                            />
                            <text className="linkLabel">{linkLabel.text}</text>
                        </g>
                    </CSSTransition>
                ))}
              </TransitionGroup>
              <g ref="tempGroup" />
            </svg>
          </div>)
    }
    public onResize(): void {
        this.viewerWidth = window.innerWidth * 0.8
        this.viewerHeight = window.innerHeight * 0.4
        this.reloadData()
    }
    public reloadData(): void {
        if (!this.treeNodes || this.treeNodes.length === 0 || !this.treeNodes[0]) return
        this.rootSize = this.treeNodes[0].size
        this.rootErrorSize = this.treeNodes[0].error
        this.rootLocalError = this.rootErrorSize / this.rootSize

        var temp_root = d3stratify()(this.treeNodes)
        const treemap = d3tree().size([this.viewerWidth * 0.9, 0.85 * this.viewerHeight])
        this.root = treemap(temp_root)
    }
    public getTextBB(labelText) {
        var temp = select(SvgOuterFrame.current).append('g')
        temp.selectAll('*').remove()
        temp.append('text').attr('className', 'linkLabel').text(`${labelText}`)
  
        const bb = temp.node().getBBox()
        temp.selectAll('*').remove()
        return bb
    }
    public skippedInstances(node) {
        return node.data.badFeaturesRowCount !== 0
          ? `Skipped Instances: ${node.data.badFeaturesRowCount}`
          : ''
    }
    public clearSelection(): void {
        if (this.selected_node) {
          this.unselectParentNodes(this.selected_node)
        }
        this.nodeDetail.showSelected = { opacity: 0 }
        // this.$emit('node-clicked', null)
    }
    public bkgClick(): void {
        this.clearSelection()
        this.forceUpdate()
    }
    public selectParentNodes(d): void {
        if (!d) return
        d.data.isSelected = true
        this.selectParentNodes(d.parent)
    }
    public unselectParentNodes(d): void {
        if (!d) return
        d.data.isSelected = false
        this.unselectParentNodes(d.parent)
    }
    public select(index, node, event): void {
        event.stopPropagation();
        // NOTE: This is an unfortunate work around to select the TreeView control as the standard way of letting
        //       the @click propagate to the parent is having negative side affects on the tree view rendering.
        // this.selectedPanelId = this.id
        if (this.selected_node) {
          this.unselectParentNodes(this.selected_node)
        }
        this.selected = index
        this.selectParentNodes(node)
        this.selected_node = node
  
        // APPLY TO NODEDETAIL OBJECT TO UPDATE DISPLAY PANEL
        this.nodeDetail.showSelected = { opacity: 1 }
        this.nodeDetail.instanceInfo = `${node.data.size} Instances`
        this.nodeDetail.errorInfo = `${node.data.error} Error`
        this.nodeDetail.successInfo = `${node.data.success} Success`
        this.nodeDetail.globalError = ((node.data.error / this.rootErrorSize) * 100).toFixed(2)
        this.nodeDetail.localError = ((node.data.error / node.data.size) * 100).toFixed(2)
        this.nodeDetail.errorColor = node.errorColor
        this.nodeDetail.mask_down = { transform: `translate(0px, -${node.maskShift}px)` }
        this.nodeDetail.mask_up = { transform: `translate(0px, ${node.maskShift}px)` }
  
        // this.$emit('node-clicked', node.data)
        this.forceUpdate()
    }
    public componentDidMount() {
        window.addEventListener('resize', this.onResize.bind(this));
    }
    public componentWillUnmount(){
        window.removeEventListener('resize', this.onResize.bind(this));
    }
}